import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { initializeWebSockets } from './sockets.js';
import { ReferralService } from './services/referralService.js';
import { AdService, AD_PRICING_PLANS } from './services/adService.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;

const allowedOrigins = [
  'https://viajes.demiempresa.online',
  'https://demiempresa.online',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.demiempresa.online') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(express.json());

const io = initializeWebSockets(server);

// 1. HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'demiempresa.online Rides & B2B Commercial Hub API',
    infrastructure: 'Render Always-On + Redis + PostgreSQL',
    tablePrefix: 'viajes_',
    domains: {
      pwa: 'viajes.demiempresa.online',
      api: 'api.demiempresa.online'
    },
    geoRadiusKm: 1.0,
    offerTTLSeconds: 10,
    driverWeeklySubscription: '$10.00 USD',
    driverBonusCapWeekly: 10,
    referralPressureDays: '7+7 Días',
    timestamp: new Date().toISOString()
  });
});

// 2. REGISTRO & VALIDACIÓN (DUI SALVADOREÑO)
function isValidSalvadoranDUI(dui) {
  return /^\d{8}-\d{1}$/.test(dui);
}

app.post('/api/users/register', async (req, res) => {
  const { fullName, phone, dui, role = 'PASSENGER', referrerCode } = req.body;

  if (!fullName || !phone || !dui) {
    return res.status(400).json({ error: 'Nombre, teléfono y DUI son obligatorios' });
  }

  if (!isValidSalvadoranDUI(dui)) {
    return res.status(400).json({ error: 'El DUI no tiene un formato válido (ej. 01234567-8)' });
  }

  try {
    const userRes = await pool.query(`
      INSERT INTO viajes_users (full_name, phone, dui, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (dui) DO UPDATE SET phone = EXCLUDED.phone
      RETURNING *;
    `, [fullName, phone, dui, role]);

    const user = userRes.rows[0];

    if (referrerCode && referrerCode !== dui) {
      try {
        const referrerRes = await pool.query('SELECT id FROM viajes_users WHERE dui = $1 OR id::text = $1', [referrerCode]);
        if (referrerRes.rows.length > 0) {
          await ReferralService.createReferral({
            referrerUserId: referrerRes.rows[0].id,
            referredUserId: user.id,
            referralType: 'PASSENGER_TO_PASSENGER'
          });
        }
      } catch (refErr) {
        console.warn('No se pudo registrar la referencia:', refErr.message);
      }
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ error: 'Error al registrar el usuario en base de datos' });
  }
});

// 3. PROGRAMA DE REFERIDOS & CRÉDITOS
app.get('/api/referrals/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const credit = await ReferralService.getAvailableCredit(userId);
    const referralsRes = await pool.query(
      'SELECT * FROM viajes_referrals WHERE referrer_user_id = $1 ORDER BY registered_at DESC',
      [userId]
    );

    res.json({
      availableCredit: credit,
      referrals: referralsRes.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. MÓDULO B2B: CAPTACIÓN Y PAUTAS
app.get('/api/b2b/pricing', (req, res) => {
  res.json({
    plans: AD_PRICING_PLANS,
    creativeSupport: 'Edición gráfica y de guión express incluida a partir de 2-3 fotos de celular por WhatsApp',
    contactSupport: 'demiempresa.online'
  });
});

app.post('/api/b2b/leads', async (req, res) => {
  const { businessName, whatsapp, municipality } = req.body;
  if (!businessName || !whatsapp || !municipality) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios (Nombre, WhatsApp, Municipio)' });
  }

  try {
    const result = await AdService.captureHotLead({ businessName, whatsapp, municipality });
    res.json({
      success: true,
      message: 'Lead registrado exitosamente',
      ...result
    });
  } catch (err) {
    console.error('Error al capturar lead B2B:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/b2b/feed/:municipality', async (req, res) => {
  try {
    const { municipality } = req.params;
    const feed = await AdService.getFeedForDestination(municipality);
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. CONDUCTORES: PERFIL Y CUOTA SEMANAL (CAP 10)
app.get('/api/drivers/:driverProfileId/subscription', async (req, res) => {
  try {
    const { driverProfileId } = req.params;
    const profileRes = await pool.query('SELECT * FROM viajes_driver_profiles WHERE id = $1', [driverProfileId]);
    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    const profile = profileRes.rows[0];
    const bonusesCount = profile.current_week_bonuses_count;
    const netFee = Math.max(0.00, 10.00 - bonusesCount * 1.00);

    res.json({
      driverProfileId,
      vehiclePlate: profile.vehicle_plate,
      currentWeekBonuses: bonusesCount,
      bonusCap: 10,
      baseFeeWeekly: 10.00,
      netFeeToPay: netFee,
      isBonusCapReached: bonusesCount >= 10,
      trialEndsAt: profile.trial_ends_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS Y ENDPOINT ADMIN
async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL no definida. Saltando migración automática.');
    return;
  }
  try {
    const fs = await import('fs');
    const path = await import('path');
    const schemaPath = path.resolve('schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(sql);
      console.log('✅ Tablas viajes_* y datos semilla verificados e inicializados en PostgreSQL.');
    }
  } catch (err) {
    console.error('⚠️ Error al inicializar esquema viajes_*:', err.message);
  }
}

app.get('/api/admin/init-db', async (req, res) => {
  try {
    await initializeDatabase();
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'viajes_%'
      ORDER BY table_name ASC;
    `);

    const driversCount = await pool.query('SELECT count(*) FROM viajes_driver_profiles;');
    const merchantsCount = await pool.query('SELECT count(*) FROM viajes_merchants;');

    res.json({
      success: true,
      message: 'Base de datos para demiempresa viajes inicializada con éxito.',
      database: 'PostgreSQL Cloud',
      tablesCreated: tablesRes.rows.map(r => r.table_name),
      stats: {
        drivers: parseInt(driversCount.rows[0].count),
        merchants: parseInt(merchantsCount.rows[0].count)
      }
    });
  } catch (err) {
    console.error('Error en /api/admin/init-db:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. CRON WORKER AUTOMÁTICO PARA EXPIRACIÓN 7+7
setInterval(async () => {
  try {
    const sweepResult = await ReferralService.runTTLExpirationSweep();
    if (sweepResult.expiredReferrals > 0 || sweepResult.expiredCredits > 0) {
      console.log(`🧹 Barrido TTL 7+7 ejecutado: ${sweepResult.expiredReferrals} referencias y ${sweepResult.expiredCredits} créditos expirados.`);
    }
  } catch (err) {
    console.error('Error en tarea programada TTL:', err.message);
  }
}, 1000 * 60 * 60);

server.listen(PORT, async () => {
  console.log(`🚀 Servidor demiempresa.online corriendo en http://localhost:${PORT}`);
  console.log(`📡 Tablas aisladas con prefijo: viajes_*`);
  await initializeDatabase();
});
