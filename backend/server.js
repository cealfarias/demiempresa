import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import { initializeWebSockets } from './sockets.js';
import { ReferralService } from './services/referralService.js';
import { AdService, AD_PRICING_PLANS } from './services/adService.js';
import { LedgerService } from './services/ledgerService.js';

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  const { fullName, phone, dui, referrerCode } = req.body;

  if (!fullName || !phone || !dui) {
    return res.status(400).json({ error: 'Nombre, teléfono y DUI son obligatorios' });
  }

  if (!isValidSalvadoranDUI(dui)) {
    return res.status(400).json({ error: 'El DUI no tiene un formato válido (ej. 01234567-8)' });
  }

  // CORTAFUEGOS ESTRICTO DE ROLES:
  // Todo autoregistro en la app móvil/web es exclusivamente PASSENGER.
  // Los conductores tienen onboarding administrativo con validación de placas, DUI y licencia.
  const role = 'PASSENGER';

  try {
    const userRes = await pool.query(`
      INSERT INTO viajes_users (full_name, phone, dui, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (dui) DO UPDATE SET phone = EXCLUDED.phone
      RETURNING *;
    `, [fullName, phone, dui, role]);

    const user = userRes.rows[0];

    // 1. Crear Wallet Criptográfica y Acreditar Bono de Bienvenida ($1.00 USD - 7 Días)
    let walletInfo = null;
    let welcomeBonusTx = null;
    try {
      const bonusRes = await LedgerService.grantWelcomeBonus(user.id);
      walletInfo = bonusRes.wallet;
      welcomeBonusTx = bonusRes.transaction;
    } catch (ledgerErr) {
      console.warn('⚠️ No se pudo generar bono en el Ledger criptográfico:', ledgerErr.message);
    }

    // 2. Acreditar Bono al Anfitrión si viene con Referido válido
    if (referrerCode && referrerCode !== dui) {
      try {
        const referrerRes = await pool.query('SELECT id FROM viajes_users WHERE dui = $1 OR id::text = $1', [referrerCode]);
        if (referrerRes.rows.length > 0) {
          const hostId = referrerRes.rows[0].id;
          await ReferralService.createReferral({
            referrerUserId: hostId,
            referredUserId: user.id,
            referralType: 'PASSENGER_TO_PASSENGER'
          });
          // Acreditar bono criptográfico inmutable de $1.00 USD al anfitrión
          await LedgerService.grantReferralBonus(hostId, user.id);
        }
      } catch (refErr) {
        console.warn('No se pudo registrar la referencia:', refErr.message);
      }
    }

    res.json({
      success: true,
      user,
      wallet: walletInfo ? { address: walletInfo.address, referralCode: walletInfo.referral_code } : null,
      welcomeBonus: welcomeBonusTx
    });
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
    let profileRes = await pool.query(
      'SELECT * FROM viajes_driver_profiles WHERE id::text = $1 OR vehicle_plate = $1',
      [driverProfileId]
    ).catch(() => ({ rows: [] }));

    let profile = profileRes.rows[0];
    if (!profile) {
      const fallbackRes = await pool.query('SELECT * FROM viajes_driver_profiles ORDER BY created_at ASC LIMIT 1');
      profile = fallbackRes.rows[0];
    }

    if (!profile) {
      return res.json({
        driverProfileId,
        vehiclePlate: 'P-584-912',
        currentWeekBonuses: 0,
        bonusCap: 10,
        baseFeeWeekly: 10.00,
        netFeeToPay: 10.00,
        isBonusCapReached: false,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    const bonusesCount = profile.current_week_bonuses_count || 0;
    const netFee = Math.max(0.00, 10.00 - bonusesCount * 1.00);

    res.json({
      driverProfileId: profile.id,
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

// 5.0 REGISTRO Y EXPEDIENTE DIGITAL DEL CONDUCTOR (CUMPLIMIENTO & AUDITORÍA)
app.post('/api/drivers/register', async (req, res) => {
  try {
    const {
      fullName,
      phone,
      dui,
      emergencyContactName,
      emergencyContactPhone,
      licenseNumber,
      vehiclePlate,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      fuelType = 'REGULAR',
      fuelKmPerGallon = 42.0,
      photoUrl,
      duiFrontUrl,
      duiBackUrl,
      licenseFrontUrl,
      licenseBackUrl,
      circulationCardUrl,
      policeRecordUrl,
      criminalRecordUrl,
      vehiclePhotoFront,
      vehiclePhotoInside
    } = req.body;

    if (!fullName || !phone || !dui || !licenseNumber || !vehiclePlate) {
      return res.status(400).json({ error: 'Nombre, teléfono, DUI, licencia y placa son obligatorios' });
    }

    if (!isValidSalvadoranDUI(dui)) {
      return res.status(400).json({ error: 'El DUI no tiene un formato salvadoreño válido (ej. 01234567-8)' });
    }

    const cleanPlate = vehiclePlate.trim().toUpperCase();
    const cleanLicense = licenseNumber.trim().toUpperCase();

    // 1. Verificar si la placa ya pertenece a otro conductor
    const plateCheck = await pool.query(
      'SELECT dp.id, u.full_name FROM viajes_driver_profiles dp JOIN viajes_users u ON dp.user_id = u.id WHERE dp.vehicle_plate = $1 AND u.dui <> $2',
      [cleanPlate, dui]
    );
    if (plateCheck.rows.length > 0) {
      return res.status(400).json({ error: `La placa ${cleanPlate} ya se encuentra registrada en la plataforma.` });
    }

    // 2. Verificar o crear el usuario en viajes_users
    let userRes = await pool.query('SELECT * FROM viajes_users WHERE dui = $1', [dui]);
    let user;
    if (userRes.rows.length === 0) {
      const newUser = await pool.query(
        'INSERT INTO viajes_users (full_name, phone, dui, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [fullName, phone, dui, 'DRIVER']
      );
      user = newUser.rows[0];
    } else {
      user = userRes.rows[0];
      await pool.query(
        'UPDATE viajes_users SET full_name = $1, phone = $2 WHERE id = $3',
        [fullName, phone, user.id]
      );
    }

    // 3. Crear o actualizar el perfil del conductor en viajes_driver_profiles
    const existingProfile = await pool.query(
      'SELECT * FROM viajes_driver_profiles WHERE user_id = $1',
      [user.id]
    );

    let profile;
    const defaultPhoto = photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

    if (existingProfile.rows.length > 0) {
      const updateRes = await pool.query(`
        UPDATE viajes_driver_profiles SET
          vehicle_plate = $1,
          vehicle_brand = $2,
          vehicle_model = $3,
          vehicle_color = $4,
          vehicle_year = $5,
          license_number = $6,
          fuel_type = $7,
          fuel_km_per_gallon = $8,
          photo_url = COALESCE($9, photo_url),
          dui_front_url = COALESCE($10, dui_front_url),
          dui_back_url = COALESCE($11, dui_back_url),
          license_front_url = COALESCE($12, license_front_url),
          license_back_url = COALESCE($13, license_back_url),
          circulation_card_url = COALESCE($14, circulation_card_url),
          police_record_url = COALESCE($15, police_record_url),
          criminal_record_url = COALESCE($16, criminal_record_url),
          vehicle_photo_front = COALESCE($17, vehicle_photo_front),
          vehicle_photo_inside = COALESCE($18, vehicle_photo_inside),
          emergency_contact_name = $19,
          emergency_contact_phone = $20,
          approval_status = 'PENDING',
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE user_id = $21
        RETURNING *;
      `, [
        cleanPlate, vehicleBrand || 'Toyota', vehicleModel || 'Corolla', vehicleColor || 'Gris Plata',
        parseInt(vehicleYear, 10) || 2018, cleanLicense, fuelType, parseFloat(fuelKmPerGallon) || 42.0,
        defaultPhoto, duiFrontUrl || null, duiBackUrl || null, licenseFrontUrl || null, licenseBackUrl || null,
        circulationCardUrl || null, policeRecordUrl || null, criminalRecordUrl || null,
        vehiclePhotoFront || null, vehiclePhotoInside || null,
        emergencyContactName || null, emergencyContactPhone || null,
        user.id
      ]);
      profile = updateRes.rows[0];
    } else {
      const insertRes = await pool.query(`
        INSERT INTO viajes_driver_profiles (
          user_id, vehicle_plate, vehicle_brand, vehicle_model, vehicle_color, vehicle_year,
          license_number, fuel_type, fuel_km_per_gallon, photo_url,
          dui_front_url, dui_back_url, license_front_url, license_back_url,
          circulation_card_url, police_record_url, criminal_record_url,
          vehicle_photo_front, vehicle_photo_inside,
          emergency_contact_name, emergency_contact_phone,
          approval_status, is_active, is_online
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19,
          $20, $21,
          'PENDING', FALSE, FALSE
        ) RETURNING *;
      `, [
        user.id, cleanPlate, vehicleBrand || 'Toyota', vehicleModel || 'Corolla', vehicleColor || 'Gris Plata',
        parseInt(vehicleYear, 10) || 2018, cleanLicense, fuelType, parseFloat(fuelKmPerGallon) || 42.0,
        defaultPhoto, duiFrontUrl || null, duiBackUrl || null, licenseFrontUrl || null, licenseBackUrl || null,
        circulationCardUrl || null, policeRecordUrl || null, criminalRecordUrl || null,
        vehiclePhotoFront || null, vehiclePhotoInside || null,
        emergencyContactName || null, emergencyContactPhone || null
      ]);
      profile = insertRes.rows[0];
    }

    res.json({
      success: true,
      message: 'Expediente de conductor recibido exitosamente. Tu documentación está en revisión administrativa.',
      driverProfile: {
        id: profile.id,
        userId: user.id,
        fullName: user.full_name,
        phone: user.phone,
        dui: user.dui,
        vehiclePlate: profile.vehicle_plate,
        vehicleBrand: profile.vehicle_brand,
        vehicleModel: profile.vehicle_model,
        vehicleYear: profile.vehicle_year,
        vehicleColor: profile.vehicle_color,
        approvalStatus: profile.approval_status
      }
    });
  } catch (err) {
    console.error('Error en /api/drivers/register:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.1 CONSULTA DE ESTADO DE APROBACIÓN DEL CONDUCTOR
app.get('/api/drivers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const profileRes = await pool.query(`
      SELECT dp.*, u.full_name, u.phone, u.dui
      FROM viajes_driver_profiles dp
      JOIN viajes_users u ON dp.user_id = u.id
      WHERE dp.id::text = $1 OR dp.user_id::text = $1 OR dp.vehicle_plate = $1 OR u.dui = $1;
    `, [id]);

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil de conductor no encontrado' });
    }

    const row = profileRes.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      phone: row.phone,
      dui: row.dui,
      licenseNumber: row.license_number,
      vehiclePlate: row.vehicle_plate,
      vehicleBrand: row.vehicle_brand,
      vehicleModel: row.vehicle_model,
      vehicleYear: row.vehicle_year,
      vehicleColor: row.vehicle_color,
      photoUrl: row.photo_url,
      approvalStatus: row.approval_status,
      rejectionReason: row.rejection_reason,
      isActive: row.is_active,
      isOnline: row.is_online,
      currentWeekBonuses: row.current_week_bonuses_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.2 BANDEJA ADMINISTRATIVA: LISTADO DE EXPEDIENTES DE CONDUCTORES
app.get('/api/admin/drivers/list', async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT dp.*, u.full_name, u.phone, u.dui
      FROM viajes_driver_profiles dp
      JOIN viajes_users u ON dp.user_id = u.id
    `;
    const params = [];
    if (status) {
      query += ' WHERE dp.approval_status = $1';
      params.push(status);
    }
    query += ' ORDER BY dp.created_at DESC;';

    const listRes = await pool.query(query, params);
    res.json({
      drivers: listRes.rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        fullName: r.full_name,
        phone: r.phone,
        dui: r.dui,
        licenseNumber: r.license_number,
        vehiclePlate: r.vehicle_plate,
        vehicleBrand: r.vehicle_brand,
        vehicleModel: r.vehicle_model,
        vehicleYear: r.vehicle_year,
        vehicleColor: r.vehicle_color,
        approvalStatus: r.approval_status,
        rejectionReason: r.rejection_reason,
        photoUrl: r.photo_url,
        duiFrontUrl: r.dui_front_url,
        duiBackUrl: r.dui_back_url,
        licenseFrontUrl: r.license_front_url,
        licenseBackUrl: r.license_back_url,
        circulationCardUrl: r.circulation_card_url,
        policeRecordUrl: r.police_record_url,
        criminalRecordUrl: r.criminal_record_url,
        vehiclePhotoFront: r.vehicle_photo_front,
        vehiclePhotoInside: r.vehicle_photo_inside,
        createdAt: r.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.3 CORTAFUEGOS ANTI-ARBITRAJE: APROBACIÓN ADMINISTRATIVA DE CONDUCTORES
app.post('/api/admin/drivers/approve', async (req, res) => {
  try {
    const { userId, driverProfileId, adminId = 'ADMIN_SUPERVISOR' } = req.body;
    let targetUserId = userId;

    if (!targetUserId && driverProfileId) {
      const dRes = await pool.query('SELECT user_id FROM viajes_driver_profiles WHERE id::text = $1', [driverProfileId]);
      if (dRes.rows.length > 0) targetUserId = dRes.rows[0].user_id;
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'userId o driverProfileId es obligatorio para la aprobación del conductor' });
    }

    const result = await LedgerService.cancelPromotionalBonusesOnDriverApproval(targetUserId, adminId);
    res.json(result);
  } catch (err) {
    console.error('Error al aprobar conductor administrativamente:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.4 RECHAZO ADMINISTRATIVO CON RETROALIMENTACIÓN
app.post('/api/admin/drivers/reject', async (req, res) => {
  try {
    const { driverProfileId, userId, reason = 'Documentación incompleta o ilegible' } = req.body;
    if (!driverProfileId && !userId) {
      return res.status(400).json({ error: 'driverProfileId o userId es requerido' });
    }

    const updateRes = await pool.query(`
      UPDATE viajes_driver_profiles
      SET approval_status = 'REJECTED',
          rejection_reason = $1,
          is_active = FALSE,
          is_online = FALSE,
          updated_at = NOW()
      WHERE id::text = $2 OR user_id::text = $2
      RETURNING *;
    `, [reason, (driverProfileId || userId).toString()]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    res.json({
      success: true,
      message: 'Expediente marcado como RECHAZADO con motivo especificado',
      driverProfile: updateRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.1 CONFIGURACIÓN DE VEHÍCULO Y RENDIMIENTO DE GASOLINA
app.put('/api/drivers/:driverProfileId/vehicle', async (req, res) => {
  try {
    const { driverProfileId } = req.params;
    const { vehicleYear, fuelType, fuelKmPerGallon } = req.body;

    const updateRes = await pool.query(`
      UPDATE viajes_driver_profiles 
      SET vehicle_year = COALESCE($1, vehicle_year),
          fuel_type = COALESCE($2, fuel_type),
          fuel_km_per_gallon = COALESCE($3, fuel_km_per_gallon)
      WHERE id = $4
      RETURNING id, vehicle_brand, vehicle_model, vehicle_year, fuel_type, fuel_km_per_gallon;
    `, [vehicleYear, fuelType, fuelKmPerGallon, driverProfileId]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    res.json({ success: true, vehicle: updateRes.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.2 GASOLINERAS, PRECIOS OFICIALES GOBIERNO DGEHM Y REPORTES DE CHOFERES
app.get('/api/gas/stations', async (req, res) => {
  try {
    const stationsRes = await pool.query(`
      SELECT 
        id, brand, station_name, address, municipality, lat, lng,
        regular_price, especial_price, diesel_price,
        gov_regular_price, gov_especial_price, gov_diesel_price,
        (gov_regular_price - regular_price) AS savings_regular,
        (gov_especial_price - especial_price) AS savings_especial,
        (gov_diesel_price - diesel_price) AS savings_diesel,
        verified_reports_count, last_verified_at
      FROM viajes_gas_stations
      ORDER BY regular_price ASC;
    `);

    res.json({
      stations: stationsRes.rows,
      officialGovernmentPrices: {
        zone: 'Zona Central (San Salvador / La Libertad)',
        regular: 4.75,
        especial: 5.13,
        diesel: 4.25,
        source: 'Dirección General de Energía, Hidrocarburos y Minas (DGEHM) El Salvador',
        updatedPeriod: 'Quincena Vigente'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gas/report', async (req, res) => {
  try {
    const { stationId, driverProfileId, fuelType = 'REGULAR', reportedPrice, notes } = req.body;
    if (!stationId || !reportedPrice) {
      return res.status(400).json({ error: 'Estación y precio reportado son requeridos' });
    }

    const priceNum = parseFloat(reportedPrice);

    // Registrar reporte individual del chofer
    await pool.query(`
      INSERT INTO viajes_gas_reports (station_id, driver_id, fuel_type, reported_price, notes)
      VALUES ($1, $2, $3, $4, $5);
    `, [stationId, driverProfileId || null, fuelType, priceNum, notes || 'Confirmado al recargar']);

    // Actualizar precio verificado en la estación
    let colToUpdate = 'regular_price';
    if (fuelType === 'ESPECIAL') colToUpdate = 'especial_price';
    if (fuelType === 'DIESEL') colToUpdate = 'diesel_price';

    await pool.query(`
      UPDATE viajes_gas_stations
      SET ${colToUpdate} = $1,
          verified_reports_count = verified_reports_count + 1,
          last_verified_at = CURRENT_TIMESTAMP
      WHERE id = $2;
    `, [priceNum, stationId]);

    res.json({
      success: true,
      message: '¡Gracias por confirmar el precio! Ayudas a toda la comunidad de conductores a ahorrar en gasolina.',
      fuelType,
      updatedPrice: priceNum
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// 6. RUTAS DEL LIBRO MAYOR CRIPTOGRÁFICO Y WALLET (UTXO INMUTABLE)
// =====================================================================

// GET /api/wallet/summary - Saldo activo, días restantes y dirección pública
app.get(['/api/wallet/summary', '/api/wallet/summary/:userId'], async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId || req.headers['x-user-id'];
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const summary = await LedgerService.getWalletSummary(userId);
    res.json(summary);
  } catch (err) {
    console.error('Error en /api/wallet/summary:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/history - Historial con hashes criptográficos SHA-256
app.get(['/api/wallet/history', '/api/wallet/history/:userId'], async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId || req.headers['x-user-id'];
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const history = await LedgerService.getWalletHistory(userId);
    res.json(history);
  } catch (err) {
    console.error('Error en /api/wallet/history:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wallet/referrals - Lista de invitados con cuenta regresiva y enlace directo a WhatsApp
app.get(['/api/wallet/referrals', '/api/wallet/referrals/:userId'], async (req, res) => {
  try {
    const userId = req.params.userId || req.query.userId || req.headers['x-user-id'];
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const data = await LedgerService.getReferralsList(userId);
    res.json(data);
  } catch (err) {
    console.error('Error en /api/wallet/referrals:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/welcome-bonus - Solicitar bono de bienvenida explícito
app.post('/api/wallet/welcome-bonus', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId es requerido' });

    const result = await LedgerService.grantWelcomeBonus(userId);
    res.json(result);
  } catch (err) {
    console.error('Error en /api/wallet/welcome-bonus:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wallet/transfer-trip - Transferir bono para pago de carrera (Pasajero -> Chofer)
app.post('/api/wallet/transfer-trip', async (req, res) => {
  try {
    const { passengerId, driverId, tripId, amount = 1.00 } = req.body;
    if (!passengerId || !driverId) {
      return res.status(400).json({ error: 'passengerId y driverId son requeridos' });
    }

    const result = await LedgerService.transferTripPayment(passengerId, driverId, tripId || `TRIP-${Date.now()}`, parseFloat(amount));
    res.json(result);
  } catch (err) {
    console.error('Error en /api/wallet/transfer-trip:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/wallet/driver/pay-weekly-fee - Chofer paga su cuota de $10 con sus bonos
app.post('/api/wallet/driver/pay-weekly-fee', async (req, res) => {
  try {
    const { driverId, bonusesToUse = 10, totalWeeklyFee = 10.00 } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId es requerido' });

    const result = await LedgerService.payWeeklyFeeWithBonuses(driverId, parseInt(bonusesToUse, 10), parseFloat(totalWeeklyFee));
    res.json(result);
  } catch (err) {
    console.error('Error en /api/wallet/driver/pay-weekly-fee:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/wallet/driver/redeem-day - Chofer canjea 1 bono por 1 día de plataforma gratis
app.post('/api/wallet/driver/redeem-day', async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId es requerido' });

    const result = await LedgerService.redeemDriverFreeDay(driverId);
    res.json(result);
  } catch (err) {
    console.error('Error en /api/wallet/driver/redeem-day:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/wallet/audit - Verificación matemática integral de la cadena SHA-256
app.get('/api/wallet/audit', async (req, res) => {
  try {
    const audit = await LedgerService.verifyLedgerIntegrity();
    res.json(audit);
  } catch (err) {
    console.error('Error en /api/wallet/audit:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================================
// 6.1 SISTEMA DE TICKETS DE SOPORTE TÉCNICO Y MEJORAS AL SISTEMA
// =====================================================================

app.post('/api/support/tickets', async (req, res) => {
  try {
    const { ticketCode, userName, phone, category = 'DUDA', subject, description } = req.body;
    if (!userName || !phone || !subject || !description) {
      return res.status(400).json({ error: 'Todos los campos son requeridos para el ticket' });
    }
    const code = ticketCode || `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    const insertRes = await pool.query(`
      INSERT INTO viajes_support_tickets (ticket_code, user_name, phone, category, subject, description)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `, [code, userName.trim(), phone.trim(), category, subject.trim(), description.trim()]);

    res.json({ success: true, ticket: insertRes.rows[0] });
  } catch (err) {
    console.error('Error en POST /api/support/tickets:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/support/tickets', async (req, res) => {
  try {
    const ticketsRes = await pool.query(`
      SELECT * FROM viajes_support_tickets
      ORDER BY created_at DESC
      LIMIT 100;
    `);
    res.json({ success: true, tickets: ticketsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. INICIALIZACIÓN AUTOMÁTICA DE BASE DE DATOS Y ENDPOINT ADMIN
async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL no definida. Saltando migración automática.');
    return;
  }
  try {
    // 0. Asegurar tabla de tickets de soporte técnico
    await pool.query(`
      CREATE TABLE IF NOT EXISTS viajes_support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_code VARCHAR(30) UNIQUE NOT NULL,
        user_name VARCHAR(150) NOT NULL,
        phone VARCHAR(25) NOT NULL,
        category VARCHAR(30) NOT NULL DEFAULT 'DUDA',
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        resolution_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});

    // 1. Asegurar columnas de cumplimiento y expediente de conductores de inmediato
    await pool.query(`
      DO $$ BEGIN
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(30);
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'PENDING';
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64);
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS dui_front_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS dui_back_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS license_front_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS license_back_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS circulation_card_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS police_record_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS criminal_record_url TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS vehicle_photo_front TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS vehicle_photo_inside TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150);
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20);
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      EXCEPTION WHEN others THEN null; END $$;
    `);

    // 2. Sincronizar precios oficiales y de mercado vigentes ($5.13 Especial)
    try {
      await pool.query(`
        UPDATE viajes_gas_stations SET
          gov_especial_price = 5.13,
          gov_regular_price = 4.75,
          gov_diesel_price = 4.25,
          especial_price = CASE 
            WHEN brand = 'DLC' THEN 5.03
            WHEN brand = 'Puma' THEN 5.06
            WHEN brand = 'Texaco' THEN 5.09
            WHEN brand = 'Uno' THEN 5.10
            ELSE 5.08
          END,
          regular_price = CASE
            WHEN brand = 'DLC' THEN 4.65
            WHEN brand = 'Puma' THEN 4.68
            WHEN brand = 'Uno' THEN 4.71
            ELSE 4.70
          END,
          diesel_price = CASE
            WHEN brand = 'DLC' THEN 4.15
            WHEN brand = 'Puma' THEN 4.18
            ELSE 4.20
          END;
      `);
      console.log('✅ Precios de estaciones actualizados con éxito ($5.13 Especial).');
    } catch (e) {
      console.warn('⚠️ Error al actualizar precios de estaciones:', e.message);
    }

    // 3. Intentar cargar schema.sql completo si existe
    try {
      const fs = await import('fs');
      const path = await import('path');
      const possiblePaths = [
        path.resolve('schema.sql'),
        path.resolve('backend/schema.sql'),
        path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'schema.sql')
      ];
      for (const schemaPath of possiblePaths) {
        if (fs.existsSync(schemaPath)) {
          const sql = fs.readFileSync(schemaPath, 'utf8');
          await pool.query(sql);
          console.log(`✅ Esquema cargado exitosamente desde ${schemaPath}`);
          break;
        }
      }
    } catch (e) {
      console.warn('⚠️ Nota sobre carga de schema.sql:', e.message);
    }

    console.log('✅ Tablas viajes_*, precios de combustible ($5.13 Especial) y columnas de conductor verificadas en PostgreSQL.');
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

app.get('/api/admin/update-gas-prices', async (req, res) => {
  try {
    const updateRes = await pool.query(`
      UPDATE viajes_gas_stations SET
        gov_especial_price = 5.13,
        gov_regular_price = 4.75,
        gov_diesel_price = 4.25,
        especial_price = CASE 
          WHEN brand = 'DLC' THEN 5.03
          WHEN brand = 'Puma' THEN 5.06
          WHEN brand = 'Texaco' THEN 5.09
          WHEN brand = 'Uno' THEN 5.10
          ELSE 5.08
        END,
        regular_price = CASE
          WHEN brand = 'DLC' THEN 4.65
          WHEN brand = 'Puma' THEN 4.68
          WHEN brand = 'Uno' THEN 4.71
          ELSE 4.70
        END,
        diesel_price = CASE
          WHEN brand = 'DLC' THEN 4.15
          WHEN brand = 'Puma' THEN 4.18
          ELSE 4.20
        END;
    `);
    const stations = await pool.query(`SELECT brand, station_name, regular_price, especial_price, gov_especial_price FROM viajes_gas_stations;`);
    res.json({
      success: true,
      message: 'Precios de combustible actualizados exitosamente en PostgreSQL Cloud',
      rowsUpdated: updateRes.rowCount,
      stations: stations.rows
    });
  } catch (err) {
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
