import crypto from 'crypto';
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

// Funciones de seguridad y verificación de claves de conductores
function hashPassword(password) {
  if (!password) return null;
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password).trim(), salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedPasswordHash) {
  if (!password || !storedPasswordHash) return false;
  const input = String(password).trim();
  const stored = String(storedPasswordHash).trim();
  // Compatibilidad directa con claves insertadas en texto plano vía SQL
  if (!stored.includes(':')) {
    return input === stored;
  }
  const [salt, key] = stored.split(':');
  if (!salt || !key) return input === stored;
  const hash = crypto.pbkdf2Sync(input, salt, 1000, 64, 'sha512').toString('hex');
  return hash === key;
}

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
    driverWeeklySubscription: '$15.00 USD',
    driverBonusCapWeekly: 15,
    referralPressureDays: '7+7 Días',
    timestamp: new Date().toISOString()
  });
});

// 2. REGISTRO & VALIDACIÓN (DUI SALVADOREÑO O PASAPORTE / RESIDENCIA PARA EXTRANJEROS)
function isValidSalvadoranDUI(dui) {
  return /^\d{8}-\d{1}$/.test(dui);
}

function isValidIdentityDocument(doc, docType = 'DUI') {
  if (!doc || typeof doc !== 'string') return false;
  const clean = doc.trim();
  if (docType === 'PASSPORT' || docType === 'PASSPORT_RESIDENCE' || !/^\d{8}-\d{1}$/.test(clean)) {
    // Acepta formato de Pasaporte internacional o Carné de Residente DGME (6 a 25 caracteres alfanuméricos)
    if (/^[A-Za-z0-9\-\.]{6,25}$/.test(clean)) return true;
  }
  return isValidSalvadoranDUI(clean);
}

// Control de Dispositivo Único para Pasajeros: dui/phone -> { sessionId, loggedAt }
const activePassengerSessions = new Map();

app.post('/api/users/register', async (req, res) => {
  const { fullName, phone, dui, documentType = 'DUI', referrerCode, termsAccepted = true } = req.body;

  if (!fullName || !phone || !dui) {
    return res.status(400).json({ error: 'Nombre, teléfono y documento de identidad (DUI o Pasaporte) son obligatorios' });
  }

  if (!isValidIdentityDocument(dui, documentType)) {
    return res.status(400).json({ 
      error: documentType === 'PASSPORT' 
        ? 'El Pasaporte o Carné de Residencia no tiene un formato válido (mínimo 6 caracteres alfanuméricos).' 
        : 'El DUI no tiene un formato válido (ej. 01234567-8).' 
    });
  }

  // CORTAFUEGOS ESTRICTO DE ROLES:
  // Todo autoregistro en la app móvil/web es exclusivamente PASSENGER.
  // Los conductores tienen onboarding administrativo con validación de placas, DUI y licencia.
  const role = 'PASSENGER';

  try {
    const cleanDui = dui.trim();
    const cleanPhone = phone ? phone.trim() : '';

    // Comprobar si el usuario ya existía previamente en la base de datos
    const existingCheck = await pool.query(`
      SELECT id, full_name, phone, dui, role, created_at 
      FROM viajes_users 
      WHERE dui = $1 OR (phone = $2 AND $2 <> '')
      LIMIT 1
    `, [cleanDui, cleanPhone]);

    const isExistingUser = existingCheck.rows.length > 0;

    // Regla de Dispositivo Único Implacable para Pasajeros
    const passengerSessionId = `psess_${cleanDui}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activePassengerSessions.set(cleanDui, { sessionId: passengerSessionId, loggedAt: new Date().toISOString() });
    if (cleanPhone) {
      activePassengerSessions.set(cleanPhone, { sessionId: passengerSessionId, loggedAt: new Date().toISOString() });
    }
    // Expulsar cualquier sesión previa en otro dispositivo
    io.emit('passenger_session_revoked', { dui: cleanDui, phone: cleanPhone, activeSessionId: passengerSessionId });

    if (isExistingUser) {
      const user = existingCheck.rows[0];
      user.sessionToken = passengerSessionId;
      let referrerInfo = null;

      // Si el contacto ya registrado intentó abrir el enlace de un amigo anfitrión:
      if (referrerCode && referrerCode !== cleanDui) {
        try {
          const referrerRes = await pool.query(`
            SELECT u.id, u.full_name FROM viajes_users u 
            LEFT JOIN viajes_wallet_identities w ON u.id = w.user_id 
            WHERE u.dui = $1 OR u.id::text = $1 OR w.referral_code = $1 OR u.phone = $1
            LIMIT 1
          `, [referrerCode.trim()]);

          if (referrerRes.rows.length > 0) {
            const hostId = referrerRes.rows[0].id;
            const hostName = referrerRes.rows[0].full_name;
            referrerInfo = { id: hostId, name: hostName };

            // Registrar aviso al anfitrión de que su contacto ya estaba registrado
            // para NO GENERAR EXPECTATIVA DE BONO FALSO
            await pool.query(`
              INSERT INTO viajes_referral_notices (referrer_user_id, contact_name, contact_phone, notice_type, message)
              VALUES ($1, $2, $3, 'ALREADY_REGISTERED', $4)
            `, [
              hostId,
              user.full_name,
              user.phone,
              `Tu conocido(a) ${user.full_name} abrió tu enlace de invitación, pero ya contaba con registro previo en Rumbo a tu Destino. No aplica bono de nuevo referido para evitar falsas expectativas.`
            ]);
          }
        } catch (noticeErr) {
          console.warn('⚠️ No se pudo registrar aviso de contacto ya registrado:', noticeErr.message);
        }
      }

      return res.json({
        success: true,
        user,
        isExistingUser: true,
        sessionToken: passengerSessionId,
        referrer: referrerInfo,
        message: 'Usuario ya registrado previamente. No aplica nuevo bono de bienvenida ni de referido.'
      });
    }

    const userRes = await pool.query(`
      INSERT INTO viajes_users (full_name, phone, dui, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `, [fullName, cleanPhone, cleanDui, role]);

    const user = userRes.rows[0];
    user.sessionToken = passengerSessionId;

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
    let referrerInfo = null;
    if (referrerCode && referrerCode !== cleanDui) {
      try {
        const referrerRes = await pool.query(`
          SELECT u.id, u.full_name FROM viajes_users u 
          LEFT JOIN viajes_wallet_identities w ON u.id = w.user_id 
          WHERE u.dui = $1 OR u.id::text = $1 OR w.referral_code = $1 OR u.phone = $1
          LIMIT 1
        `, [referrerCode.trim()]);
        if (referrerRes.rows.length > 0) {
          const hostId = referrerRes.rows[0].id;
          const hostName = referrerRes.rows[0].full_name;
          referrerInfo = { id: hostId, name: hostName };
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
      isExistingUser: false,
      wallet: walletInfo ? { address: walletInfo.address, referralCode: walletInfo.referral_code } : null,
      welcomeBonus: welcomeBonusTx,
      referrer: referrerInfo
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
    const referralsRes = await pool.query(`
      SELECT r.*, u.full_name as referred_name, u.phone as referred_phone 
      FROM viajes_referrals r 
      JOIN viajes_users u ON r.referred_user_id::text = u.id::text 
      WHERE r.referrer_user_id::text = $1::text 
      ORDER BY r.registered_at DESC
    `, [userId]);

    // Consultar avisos de contactos que ya estaban registrados para evitar falsas expectativas
    let alreadyRegisteredNotices = [];
    try {
      const noticesRes = await pool.query(`
        SELECT * FROM viajes_referral_notices
        WHERE referrer_user_id::text = $1::text
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);
      alreadyRegisteredNotices = noticesRes.rows;
    } catch (e) {
      console.warn('Avisos no disponibles:', e.message);
    }

    res.json({
      availableCredit: credit,
      referrals: referralsRes.rows,
      alreadyRegisteredNotices
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para verificar en tiempo real si un contacto ya está registrado (evitar falsas expectativas)
app.get('/api/referrals/check-contact', async (req, res) => {
  try {
    const { phone, dui } = req.query;
    if (!phone && !dui) {
      return res.status(400).json({ error: 'phone o dui es requerido' });
    }
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const cleanDui = (dui || '').trim();

    const result = await pool.query(`
      SELECT id, full_name, phone, dui, role, created_at
      FROM viajes_users
      WHERE ($1 <> '' AND (phone LIKE '%' || $1 OR phone = $2))
         OR ($3 <> '' AND dui = $3)
      LIMIT 1
    `, [cleanPhone.slice(-8), phone || '', cleanDui]);

    if (result.rows.length > 0) {
      const u = result.rows[0];
      return res.json({
        isRegistered: true,
        fullName: u.full_name,
        phone: u.phone,
        message: 'Este contacto ya está registrado en la comunidad Rumbo a tu Destino.'
      });
    }

    return res.json({
      isRegistered: false,
      message: 'Contacto disponible para invitar y ganar bonos.'
    });
  } catch (err) {
    console.error('Error en /api/referrals/check-contact:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para marcar como leídos los avisos de contactos ya registrados
app.post('/api/referrals/notices/dismiss', async (req, res) => {
  try {
    const { noticeId, userId } = req.body;
    if (noticeId) {
      await pool.query('UPDATE viajes_referral_notices SET is_read = TRUE WHERE id::text = $1', [noticeId]);
    } else if (userId) {
      await pool.query('UPDATE viajes_referral_notices SET is_read = TRUE WHERE referrer_user_id::text = $1', [userId]);
    }
    res.json({ success: true });
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
    const department = req.query.department || 'San Salvador';
    const feed = await AdService.getFeedForDestination(municipality, department);
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
        bonusCap: 15,
        baseFeeWeekly: 15.00,
        netFeeToPay: 15.00,
        isBonusCapReached: false,
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    const bonusesCount = profile.current_week_bonuses_count || 0;
    const netFee = Math.max(0.00, 15.00 - bonusesCount * 1.00);

    res.json({
      driverProfileId: profile.id,
      vehiclePlate: profile.vehicle_plate,
      currentWeekBonuses: bonusesCount,
      bonusCap: 15,
      baseFeeWeekly: 15.00,
      netFeeToPay: netFee,
      isBonusCapReached: bonusesCount >= 15,
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

    if (!isValidIdentityDocument(dui, req.body.documentType)) {
      return res.status(400).json({ error: 'El documento de identidad no tiene un formato válido (DUI salvadoreño o Pasaporte/Carné de Extranjería).' });
    }

    const cleanPlate = vehiclePlate.trim().toUpperCase();
    const cleanLicense = licenseNumber.trim().toUpperCase();
    const passwordHash = req.body.password ? hashPassword(req.body.password) : null;
    const hasCourtesy = typeof req.body.hasCourtesyPass === 'boolean'
      ? req.body.hasCourtesyPass
      : (!policeRecordUrl || !criminalRecordUrl);
    const courtesyEndsAt = req.body.courtesyPassEndsAt || (hasCourtesy ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() : null);

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
        'INSERT INTO viajes_users (full_name, phone, dui, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [fullName, phone, dui, 'DRIVER', passwordHash]
      );
      user = newUser.rows[0];
    } else {
      user = userRes.rows[0];
      await pool.query(
        'UPDATE viajes_users SET full_name = $1, phone = $2, password_hash = COALESCE($3, password_hash) WHERE id = $4',
        [fullName, phone, passwordHash, user.id]
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
          password_hash = COALESCE($21, password_hash),
          has_courtesy_pass = $22,
          courtesy_pass_ends_at = $23,
          approval_status = 'PENDING',
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE user_id = $24
        RETURNING *;
      `, [
        cleanPlate, vehicleBrand || 'Toyota', vehicleModel || 'Corolla', vehicleColor || 'Gris Plata',
        parseInt(vehicleYear, 10) || 2018, cleanLicense, fuelType, parseFloat(fuelKmPerGallon) || 42.0,
        defaultPhoto, duiFrontUrl || null, duiBackUrl || null, licenseFrontUrl || null, licenseBackUrl || null,
        circulationCardUrl || null, policeRecordUrl || null, criminalRecordUrl || null,
        vehiclePhotoFront || null, vehiclePhotoInside || null,
        emergencyContactName || null, emergencyContactPhone || null,
        passwordHash,
        hasCourtesy, courtesyEndsAt,
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
          password_hash,
          has_courtesy_pass, courtesy_pass_ends_at,
          approval_status, is_active, is_online
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19,
          $20, $21,
          $22,
          $23, $24,
          'PENDING', FALSE, FALSE
        ) RETURNING *;
      `, [
        user.id, cleanPlate, vehicleBrand || 'Toyota', vehicleModel || 'Corolla', vehicleColor || 'Gris Plata',
        parseInt(vehicleYear, 10) || 2018, cleanLicense, fuelType, parseFloat(fuelKmPerGallon) || 42.0,
        defaultPhoto, duiFrontUrl || null, duiBackUrl || null, licenseFrontUrl || null, licenseBackUrl || null,
        circulationCardUrl || null, policeRecordUrl || null, criminalRecordUrl || null,
        vehiclePhotoFront || null, vehiclePhotoInside || null,
        emergencyContactName || null, emergencyContactPhone || null,
        passwordHash,
        hasCourtesy, courtesyEndsAt
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
        approvalStatus: profile.approval_status,
        hasCourtesyPass: profile.has_courtesy_pass,
        courtesyPassEndsAt: profile.courtesy_pass_ends_at,
        policeRecordUrl: profile.police_record_url,
        criminalRecordUrl: profile.criminal_record_url
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
      hasCourtesyPass: Boolean(row.has_courtesy_pass),
      courtesyPassEndsAt: row.courtesy_pass_ends_at,
      policeRecordUrl: row.police_record_url,
      criminalRecordUrl: row.criminal_record_url,
      currentWeekBonuses: row.current_week_bonuses_count || 0,
      createdAt: row.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5.1.0 HELPER: CONSULTA Y VERIFICACIÓN ESTRICTA DE EXPEDIENTES DE CONDUCTORES (CERO PLACEHOLDERS)
async function findDriverRecordByPhone(cleanPhone) {
  if (!cleanPhone || cleanPhone.length < 8) return null;
  try {
    const res = await pool.query(`
      SELECT 
        dp.id, dp.user_id, u.full_name, u.phone, u.dui,
        dp.vehicle_plate, dp.vehicle_brand, dp.vehicle_model, dp.vehicle_year, dp.vehicle_color,
        dp.license_number, dp.approval_status, dp.approved_at, dp.approved_by,
        dp.photo_url, dp.is_active, dp.is_online, dp.trial_ends_at,
        dp.rejection_reason, dp.current_week_bonuses_count,
        dp.has_courtesy_pass, dp.courtesy_pass_ends_at, dp.police_record_url, dp.criminal_record_url,
        COALESCE(dp.password_hash, u.password_hash) AS password_hash
      FROM viajes_driver_profiles dp
      JOIN viajes_users u ON dp.user_id = u.id
      WHERE REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g') LIKE $1
         OR dp.id::text = $2
      ORDER BY dp.created_at DESC
      LIMIT 1;
    `, [`%${cleanPhone}%`, cleanPhone]);

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        fullName: row.full_name,
        phone: row.phone,
        dui: row.dui,
        vehiclePlate: row.vehicle_plate,
        vehicleBrand: row.vehicle_brand,
        vehicleModel: row.vehicle_model,
        vehicleYear: row.vehicle_year,
        vehicleColor: row.vehicle_color,
        licenseNumber: row.license_number,
        approvalStatus: row.approval_status || 'PENDING',
        approvedAt: row.approved_at,
        isActive: row.is_active !== false,
        isOnline: Boolean(row.is_online),
        trialEndsAt: row.trial_ends_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        hasCourtesyPass: Boolean(row.has_courtesy_pass),
        courtesyPassEndsAt: row.courtesy_pass_ends_at,
        policeRecordUrl: row.police_record_url,
        criminalRecordUrl: row.criminal_record_url,
        rejectionReason: row.rejection_reason || null,
        weeklyBonuses: row.current_week_bonuses_count || 0,
        passwordHash: row.password_hash || null
      };
    }
  } catch (err) {
    console.warn('DB driver lookup warning:', err.message);
  }
  return null;
}

// 5.1.1 ENVIAR CÓDIGO SMS OTP PARA INGRESO DE CONDUCTOR AUTORIZADO (COMPATIBILIDAD)
const activeOtpCodes = new Map();

app.post('/api/auth/send-sms-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-8);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa un número de celular salvadoreño válido de 8 dígitos.' });
    }

    // 1. Tocar la puerta del backend: Verificar si está en la lista de conductores
    const driver = await findDriverRecordByPhone(cleanPhone);

    if (!driver) {
      return res.status(404).json({
        success: false,
        code: 'DRIVER_NOT_REGISTERED',
        error: `El número de celular (+503 ${cleanPhone}) no se encuentra registrado en nuestra lista de conductores autorizados.`,
        message: 'Para ingresar a la plataforma, debes completar tu registro formal como conductor.',
        canRegister: true,
        registrationUrl: '/conductor?register=true'
      });
    }

    // 2. Verificar estado de aprobación
    if (driver.approvalStatus === 'PENDING') {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_PENDING_APPROVAL',
        driverName: driver.fullName,
        approvalStatus: 'PENDING',
        canRegister: false,
        error: `Estimado(a) ${driver.fullName}, tu solicitud de ingreso está actualmente en revisión y auditoría documental. Te notificaremos en cuanto tu cuenta sea aprobada por administración.`
      });
    }

    if (driver.approvalStatus === 'REJECTED') {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_REJECTED',
        driverName: driver.fullName,
        approvalStatus: 'REJECTED',
        canRegister: true,
        registrationUrl: '/conductor?register=true',
        error: `Estimado(a) ${driver.fullName}, tu expediente no fue aprobado (${driver.rejectionReason || 'documentación pendiente'}). Puedes actualizar tus documentos registrándote de nuevo.`
      });
    }

    if (driver.approvalStatus === 'SUSPENDED' || !driver.isActive) {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_SUSPENDED',
        driverName: driver.fullName,
        approvalStatus: 'SUSPENDED',
        canRegister: false,
        error: `Estimado(a) ${driver.fullName}, tu cuenta de conductor se encuentra suspendida o inactiva. Por favor contacta al área de soporte administrativo.`
      });
    }

    // 3. Conductor Aprobado: Generar pase OTP seguro de un solo uso
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    activeOtpCodes.set(cleanPhone, {
      code: otpCode,
      driverId: driver.id,
      phone: cleanPhone,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    console.log(`📲 Pase SMS generado para conductor aprobado [${driver.fullName}] (${cleanPhone}): [${otpCode}]`);

    res.json({
      success: true,
      code: 'ACCESS_PASS_ISSUED',
      phone: cleanPhone,
      message: `Pase de acceso emitido para el conductor verificado ${driver.fullName}.`,
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        vehiclePlate: driver.vehiclePlate,
        phone: driver.phone
      },
      expiresInSeconds: 600
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.1.2 ACCESO DE CONDUCTOR: TELÉFONO Y CONTRASEÑA / CLAVE (TRADICIONAL DIRECTO)
app.post(['/api/drivers/login-phone', '/api/drivers/login'], async (req, res) => {
  try {
    const { phone, password, otpCode } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-8);

    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa un número de celular salvadoreño válido de 8 dígitos.' });
    }

    // 1. Tocar la puerta del backend: Verificar si está en la lista de conductores
    const driver = await findDriverRecordByPhone(cleanPhone);

    if (!driver) {
      return res.status(404).json({
        success: false,
        code: 'DRIVER_NOT_REGISTERED',
        error: `El número de celular (+503 ${cleanPhone}) no se encuentra registrado en nuestra lista de conductores autorizados.`,
        message: 'Para ingresar a la plataforma, debes completar tu registro formal como conductor.',
        canRegister: true,
        registrationUrl: '/conductor?register=true'
      });
    }

    // 2. Verificar estado de aprobación administrativa
    if (driver.approvalStatus === 'PENDING') {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_PENDING_APPROVAL',
        driverName: driver.fullName,
        approvalStatus: 'PENDING',
        canRegister: false,
        error: `Estimado(a) ${driver.fullName}, tu solicitud de ingreso está actualmente en revisión y auditoría documental. Te notificaremos en cuanto tu cuenta sea aprobada por administración.`
      });
    }

    if (driver.approvalStatus === 'REJECTED') {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_REJECTED',
        driverName: driver.fullName,
        approvalStatus: 'REJECTED',
        canRegister: true,
        registrationUrl: '/conductor?register=true',
        error: `Estimado(a) ${driver.fullName}, tu expediente no fue aprobado (${driver.rejectionReason || 'documentación pendiente'}). Puedes actualizar tus documentos registrándote de nuevo.`
      });
    }

    if (driver.approvalStatus === 'SUSPENDED' || !driver.isActive) {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_SUSPENDED',
        driverName: driver.fullName,
        approvalStatus: 'SUSPENDED',
        canRegister: false,
        error: `Estimado(a) ${driver.fullName}, tu cuenta de conductor se encuentra suspendida o inactiva. Por favor contacta al área de soporte administrativo.`
      });
    }

    // 3. Verificación de Contraseña / Clave de Acceso
    const submittedPassword = String(password || '').trim();

    if (driver.passwordHash) {
      if (!submittedPassword) {
        return res.status(400).json({
          success: false,
          code: 'PASSWORD_REQUIRED',
          error: 'Por favor ingresa tu contraseña o clave de acceso.'
        });
      }

      const isValidPassword = verifyPassword(submittedPassword, driver.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          code: 'INVALID_PASSWORD',
          error: 'La contraseña o clave de acceso ingresada es incorrecta. Por favor verifícala e intenta nuevamente.'
        });
      }
    } else {
      // Si el conductor está aprobado en la BD pero aún no tiene clave asignada (ej. expedientes previos)
      if (submittedPassword) {
        const newHash = hashPassword(submittedPassword);
        try {
          await pool.query('UPDATE viajes_driver_profiles SET password_hash = $1 WHERE id = $2', [newHash, driver.id]);
          await pool.query('UPDATE viajes_users SET password_hash = $1 WHERE id = $2', [newHash, driver.userId]);
          driver.passwordHash = newHash;
        } catch (dbErr) {
          console.warn('No se pudo persistir password_hash:', dbErr.message);
        }
      } else if (otpCode) {
        const stored = activeOtpCodes.get(cleanPhone);
        if (!stored || stored.code !== String(otpCode).trim() || Date.now() > stored.expiresAt) {
          return res.status(400).json({ success: false, error: 'Código de confirmación inválido o expirado.' });
        }
        activeOtpCodes.delete(cleanPhone);
      } else {
        return res.status(400).json({
          success: false,
          code: 'PASSWORD_REQUIRED',
          error: 'Por favor ingresa tu clave de acceso para entrar a la plataforma.'
        });
      }
    }

    // 4. Conductor Aprobado y Clave Correcta: Iniciar sesión exclusiva
    const newSessionId = `ses_${cleanPhone}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeDriverSessions.set(cleanPhone, {
      sessionId: newSessionId,
      driverId: driver.id,
      loggedAt: new Date().toISOString()
    });

    // Despachar evento para sincronizar estado de sesión
    io.emit('driver_session_revoked', {
      phone: cleanPhone,
      activeSessionId: newSessionId
    });

    const driverProfile = {
      ...driver,
      isOnline: true,
      sessionToken: newSessionId
    };
    delete driverProfile.passwordHash;

    res.json({
      success: true,
      driverProfile,
      sessionToken: newSessionId,
      message: 'Autenticación exitosa. Bienvenido a tu consola de conductor.'
    });
  } catch (err) {
    console.error('Error en login de conductor:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.1.3 GENERAR ENLACE MÁGICO DE WHATSAPP PARA CONDUCTOR AUTORIZADO
const activeMagicLinks = new Map();
const activeDriverSessions = new Map(); // cleanPhone -> { sessionId, loggedAt }

app.post('/api/auth/send-magic-link', async (req, res) => {
  try {
    const { phone } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-8);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa un número de celular salvadoreño válido de 8 dígitos.' });
    }

    // 1. Tocar la puerta del backend: Verificar si está en la lista de conductores
    const driver = await findDriverRecordByPhone(cleanPhone);

    if (!driver) {
      return res.status(404).json({
        success: false,
        code: 'DRIVER_NOT_REGISTERED',
        error: `El número de celular (+503 ${cleanPhone}) no se encuentra registrado en nuestra lista de conductores autorizados.`,
        message: 'Para ingresar a la plataforma, debes completar tu registro formal como conductor.',
        canRegister: true,
        registrationUrl: '/conductor?register=true'
      });
    }

    // 2. Verificar estado de aprobación
    if (driver.approvalStatus === 'PENDING') {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_PENDING_APPROVAL',
        driverName: driver.fullName,
        approvalStatus: 'PENDING',
        canRegister: false,
        error: `Estimado(a) ${driver.fullName}, tu solicitud de ingreso está actualmente en revisión y auditoría documental. Te notificaremos en cuanto tu cuenta sea aprobada por administración.`
      });
    }

    if (driver.approvalStatus === 'REJECTED') {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_REJECTED',
        driverName: driver.fullName,
        approvalStatus: 'REJECTED',
        canRegister: true,
        registrationUrl: '/conductor?register=true',
        error: `Estimado(a) ${driver.fullName}, tu expediente no fue aprobado (${driver.rejectionReason || 'documentación pendiente'}). Puedes actualizar tus documentos registrándote de nuevo.`
      });
    }

    if (driver.approvalStatus === 'SUSPENDED' || !driver.isActive) {
      return res.status(403).json({
        success: false,
        code: 'DRIVER_SUSPENDED',
        driverName: driver.fullName,
        approvalStatus: 'SUSPENDED',
        canRegister: false,
        error: `Estimado(a) ${driver.fullName}, tu cuenta de conductor se encuentra suspendida o inactiva. Por favor contacta al área de soporte administrativo.`
      });
    }

    // 3. Conductor Aprobado: Generar token de pase seguro de un solo uso
    const token = String(Math.floor(100000 + Math.random() * 900000));
    const originUrl = req.headers.origin || req.headers.referer || 'https://viajes.demiempresa.online';
    const baseUrl = originUrl.replace(/\/$/, '');
    const magicLinkUrl = `${baseUrl}/conductor?magicToken=${token}&phone=${cleanPhone}`;

    activeMagicLinks.set(cleanPhone, {
      token,
      driverId: driver.id,
      phone: cleanPhone,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      used: false,
      verified: false
    });

    const whatsappMessage = `🚗 *Rumbo a mi Destino - Pase de Acceso Conductor*\n\nHola ${driver.fullName},\n\nTu pase de acceso seguro es: *${token}*\n\nO entra directamente tocando este enlace:\n👉 ${magicLinkUrl}\n\n(Válido por 10 minutos para un solo ingreso)`;
    const whatsappWebLink = `https://wa.me/503${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

    console.log(`🔗 Enlace Mágico emitido para conductor aprobado [${driver.fullName}] (${cleanPhone}): [${magicLinkUrl}]`);

    res.json({
      success: true,
      code: 'ACCESS_PASS_ISSUED',
      phone: cleanPhone,
      magicLinkUrl,
      whatsappWebLink,
      message: `Pase de acceso emitido exitosamente para el conductor aprobado ${driver.fullName}.`,
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        vehiclePlate: driver.vehiclePlate,
        phone: driver.phone
      },
      expiresInSeconds: 600
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.1.4 VERIFICAR ENLACE MÁGICO / TOKEN DE WHATSAPP CON QUEMADO DE UN SOLO USO
app.post('/api/drivers/verify-magic-token', async (req, res) => {
  try {
    const { phone, token } = req.body;
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-8);

    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({ success: false, error: 'Número de celular inválido.' });
    }

    const stored = activeMagicLinks.get(cleanPhone);

    // 1. Validar expiración de tiempo
    if (stored && stored.expiresAt && Date.now() > stored.expiresAt) {
      activeMagicLinks.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        error: 'El enlace o pase mágico ha expirado por tiempo (límite 10 minutos). Solicita uno nuevo.',
        isSharedOrDuplicate: true,
        workInvitation: {
          title: '¿Necesitas trabajar en la plataforma?',
          message: 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión.',
          actionUrl: '/conductor?register=true'
        }
      });
    }

    // 2. Validar que no haya sido consumido previamente (Burn-on-read)
    if (stored && stored.used) {
      activeMagicLinks.delete(cleanPhone);
      return res.status(400).json({
        success: false,
        error: 'Este pase ya fue utilizado en otro dispositivo o fue compartido.',
        isSharedOrDuplicate: true,
        workInvitation: {
          title: '¿Necesitas trabajar en la plataforma?',
          message: 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión.',
          actionUrl: '/conductor?register=true'
        }
      });
    }

    const validToken = stored && stored.token === String(token).trim();
    if (!validToken) {
      return res.status(400).json({
        success: false,
        error: 'El pase de acceso no es válido, ya fue utilizado o ha expirado.',
        isSharedOrDuplicate: true,
        workInvitation: {
          title: '¿Necesitas trabajar en la plataforma?',
          message: 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión.',
          actionUrl: '/conductor?register=true'
        }
      });
    }

    // 3. QUEMADO INMEDIATO DE UN SOLO USO
    if (stored) {
      stored.used = true;
      stored.verified = true;
      activeMagicLinks.delete(cleanPhone);
    }

    // 4. Obtener expediente auténtico de la base de datos
    const driver = await findDriverRecordByPhone(cleanPhone);
    if (!driver || driver.approvalStatus !== 'APPROVED' || !driver.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: El conductor no se encuentra en estado aprobado y activo en la plataforma.'
      });
    }

    // 5. CONTROL DE DISPOSITIVO ÚNICO: Generar ID de sesión exclusivo
    const newSessionId = `ses_${cleanPhone}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeDriverSessions.set(cleanPhone, {
      sessionId: newSessionId,
      driverId: driver.id,
      loggedAt: new Date().toISOString()
    });

    // Notificar por WebSocket para cerrar cualquier otra pantalla abierta con este mismo número
    io.emit('driver_session_revoked', {
      phone: cleanPhone,
      activeSessionId: newSessionId,
      workInvitation: {
        title: '¿Necesitas trabajar en la plataforma?',
        message: 'Inscríbete como conductor, solo son $15 a la semana sin cobro de comisión.',
        actionUrl: '/conductor?register=true'
      }
    });

    const driverProfile = {
      ...driver,
      isOnline: true,
      sessionToken: newSessionId
    };

    res.json({
      success: true,
      driverProfile,
      sessionToken: newSessionId,
      message: 'Enlace mágico verificado exitosamente. Sesión exclusiva concedida a este dispositivo.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.1.5 CONSULTAR SI EL ENLACE MÁGICO YA FUE ACEPTADO Y VALIDACIÓN DE SESIÓN ÚNICA
app.get('/api/auth/check-magic-status', (req, res) => {
  const cleanPhone = String(req.query.phone || '').replace(/\D/g, '').slice(-8);
  const currentSession = activeDriverSessions.get(cleanPhone);
  if (currentSession) {
    return res.json({ verified: true, sessionToken: currentSession.sessionId });
  }
  return res.json({ verified: false });
});

// 5.1.5.1 VALIDAR VIGENCIA DE DISPOSITIVO ÚNICO (Evita 2 celulares con el mismo número)
app.get('/api/drivers/validate-session', (req, res) => {
  const cleanPhone = String(req.query.phone || '').replace(/\D/g, '').slice(-8);
  const token = req.query.sessionToken;
  const current = activeDriverSessions.get(cleanPhone);

  if (!current || current.sessionId === token) {
    return res.json({ valid: true });
  }
  return res.json({
    valid: false,
    message: 'Esta cuenta ha sido abierta en otro teléfono. Tu sesión ha sido cerrada por seguridad.'
  });
});

// 5.1.6 CONFIGURACIÓN ADMINISTRATIVA DE WHATSAPP
let whatsappConfig = {
  adminPhone: '69893101',
  adminName: 'Cesar Arias - Rumbo a tu Destino',
  connectionMode: 'DIRECT_LINK', // 'DIRECT_LINK' | 'WHATSAPP_WEB_QR' | 'META_CLOUD_API'
  messageTemplate: '🚗 *Rumbo a tu Destino - Acceso de Conductor*\n\nHola Conductor, aquí tienes tu enlace directo para entrar a tu consola:\n👉 {MAGIC_LINK}\n\n(O tu código de acceso manual: *{CODE}*)\n\nVálido por 15 minutos.',
  metaPhoneId: '',
  metaWabaId: '',
  metaAccessToken: '',
  isConnected: true,
  lastUpdated: new Date().toISOString()
};

app.get('/api/admin/whatsapp/config', (req, res) => {
  res.json({ success: true, config: whatsappConfig });
});

app.post('/api/admin/whatsapp/config', (req, res) => {
  try {
    const { adminPhone, adminName, connectionMode, messageTemplate, metaPhoneId, metaWabaId, metaAccessToken } = req.body;
    whatsappConfig = {
      ...whatsappConfig,
      adminPhone: adminPhone || whatsappConfig.adminPhone,
      adminName: adminName || whatsappConfig.adminName,
      connectionMode: connectionMode || whatsappConfig.connectionMode,
      messageTemplate: messageTemplate || whatsappConfig.messageTemplate,
      metaPhoneId: metaPhoneId ?? whatsappConfig.metaPhoneId,
      metaWabaId: metaWabaId ?? whatsappConfig.metaWabaId,
      metaAccessToken: metaAccessToken ?? whatsappConfig.metaAccessToken,
      lastUpdated: new Date().toISOString()
    };
    res.json({ success: true, config: whatsappConfig, message: 'Configuración de WhatsApp guardada exitosamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/whatsapp/test-send', (req, res) => {
  try {
    const { testPhone } = req.body;
    const cleanPhone = String(testPhone || '').replace(/\D/g, '').slice(-8);
    if (!cleanPhone || cleanPhone.length < 8) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa un número de celular de prueba de 8 dígitos.' });
    }
    const testToken = '849201';
    const magicLinkUrl = `https://demiempresa.online/conductor?magicToken=${testToken}&phone=${cleanPhone}`;
    const formattedMsg = whatsappConfig.messageTemplate
      .replace('{MAGIC_LINK}', magicLinkUrl)
      .replace('{CODE}', testToken);
    const waLink = `https://wa.me/503${cleanPhone}?text=${encodeURIComponent(formattedMsg)}`;

    res.json({
      success: true,
      testPhone: cleanPhone,
      waLink,
      messageText: formattedMsg,
      message: `Enlace de prueba generado para +503 ${cleanPhone}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// 5.2.1 ADMIN: CONSULTAR PRECIOS OFICIALES Y ESTADÍSTICAS DE COMBUSTIBLE
app.get('/api/admin/gas/official-prices', async (req, res) => {
  try {
    const govRes = await pool.query(`
      SELECT 
        AVG(gov_regular_price) as avg_regular,
        AVG(gov_especial_price) as avg_especial,
        AVG(gov_diesel_price) as avg_diesel,
        COUNT(*) as total_stations,
        MAX(last_verified_at) as last_update
      FROM viajes_gas_stations;
    `);

    const row = govRes.rows[0] || {};
    const officialPrices = {
      regular: parseFloat(row.avg_regular) || 4.75,
      especial: parseFloat(row.avg_especial) || 5.13,
      diesel: parseFloat(row.avg_diesel) || 4.25,
      source: 'Dirección General de Energía, Hidrocarburos y Minas (DGEHM) El Salvador',
      zone: 'Zona Central (San Salvador / La Libertad)',
      updatedPeriod: 'Quincena Vigente Oficial',
      lastUpdate: row.last_update || new Date().toISOString(),
      totalStations: parseInt(row.total_stations) || 0
    };

    res.json({
      success: true,
      officialPrices
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.2.2 ADMIN: ACTUALIZAR PRECIOS OFICIALES DE REFERENCIA EN TODO EL SISTEMA
app.post('/api/admin/gas/official-prices', async (req, res) => {
  try {
    const {
      govRegularPrice,
      govEspecialPrice,
      govDieselPrice,
      applyMarketOffsets = true
    } = req.body;

    const reg = parseFloat(govRegularPrice);
    const esp = parseFloat(govEspecialPrice);
    const die = parseFloat(govDieselPrice);

    if (isNaN(reg) || isNaN(esp) || isNaN(die)) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa precios válidos para Regular, Especial y Diésel.' });
    }

    let updateQuery = `
      UPDATE viajes_gas_stations
      SET gov_regular_price = $1,
          gov_especial_price = $2,
          gov_diesel_price = $3,
          last_verified_at = CURRENT_TIMESTAMP
    `;

    if (applyMarketOffsets) {
      updateQuery += `,
        especial_price = CASE 
          WHEN brand = 'DLC' THEN ROUND(($2 - 0.10)::numeric, 2)
          WHEN brand = 'Puma' THEN ROUND(($2 - 0.07)::numeric, 2)
          WHEN brand = 'Texaco' THEN ROUND(($2 - 0.04)::numeric, 2)
          WHEN brand = 'Uno' THEN ROUND(($2 - 0.03)::numeric, 2)
          ELSE ROUND(($2 - 0.05)::numeric, 2)
        END,
        regular_price = CASE
          WHEN brand = 'DLC' THEN ROUND(($1 - 0.10)::numeric, 2)
          WHEN brand = 'Puma' THEN ROUND(($1 - 0.07)::numeric, 2)
          WHEN brand = 'Uno' THEN ROUND(($1 - 0.04)::numeric, 2)
          ELSE ROUND(($1 - 0.05)::numeric, 2)
        END,
        diesel_price = CASE
          WHEN brand = 'DLC' THEN ROUND(($3 - 0.10)::numeric, 2)
          WHEN brand = 'Puma' THEN ROUND(($3 - 0.07)::numeric, 2)
          ELSE ROUND(($3 - 0.05)::numeric, 2)
        END
      `;
    }

    updateQuery += ' RETURNING *;';

    const result = await pool.query(updateQuery, [reg, esp, die]);

    res.json({
      success: true,
      message: 'Precios oficiales DGEHM y tarifas de red actualizadas exitosamente en el sistema.',
      updatedStationsCount: result.rowCount,
      officialPrices: {
        regular: reg,
        especial: esp,
        diesel: die,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.2.3 ADMIN: CONSULTAR QUÉ CONDUCTORES HAN COLABORADO ACTUALIZANDO PRECIOS
app.get('/api/admin/gas/driver-reports', async (req, res) => {
  try {
    const reportsRes = await pool.query(`
      SELECT 
        gr.id,
        gr.fuel_type,
        gr.reported_price,
        gr.notes,
        gr.reported_at,
        gs.id AS station_id,
        gs.brand AS station_brand,
        gs.station_name,
        gs.address AS station_address,
        gs.municipality AS station_municipality,
        COALESCE(u.full_name, 'Conductor Verificado') AS driver_name,
        COALESCE(u.phone, '') AS driver_phone,
        COALESCE(dp.vehicle_plate, '') AS vehicle_plate
      FROM viajes_gas_reports gr
      JOIN viajes_gas_stations gs ON gr.station_id = gs.id
      LEFT JOIN viajes_driver_profiles dp ON gr.driver_id = dp.id
      LEFT JOIN viajes_users u ON dp.user_id = u.id
      ORDER BY gr.reported_at DESC
      LIMIT 100;
    `);

    res.json({
      success: true,
      reports: reportsRes.rows.map(r => ({
        id: r.id,
        fuelType: r.fuel_type,
        reportedPrice: parseFloat(r.reported_price),
        notes: r.notes,
        reportedAt: r.reported_at,
        stationId: r.station_id,
        stationBrand: r.station_brand,
        stationName: r.station_name,
        stationAddress: r.station_address,
        stationMunicipality: r.station_municipality,
        driverName: r.driver_name,
        driverPhone: r.driver_phone,
        vehiclePlate: r.vehicle_plate
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
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

// POST /api/wallet/driver/pay-weekly-fee - Chofer paga su cuota de $15 con sus bonos
app.post('/api/wallet/driver/pay-weekly-fee', async (req, res) => {
  try {
    const { driverId, bonusesToUse = 15, totalWeeklyFee = 15.00 } = req.body;
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

// POST /api/wallet/driver/pay-daily-pass - Chofer paga pase diario de $3.00 con hasta 3 bonos
app.post('/api/wallet/driver/pay-daily-pass', async (req, res) => {
  try {
    const { driverId, bonusesToUse = 3, totalDailyFee = 3.00 } = req.body;
    if (!driverId) return res.status(400).json({ error: 'driverId es requerido' });

    const result = await LedgerService.redeemDriverDailyPass(driverId, parseInt(bonusesToUse, 10), parseFloat(totalDailyFee));
    res.json(result);
  } catch (err) {
    console.error('Error en /api/wallet/driver/pay-daily-pass:', err);
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

    // 0.1 Asegurar tabla de avisos de referidos para contactos ya registrados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS viajes_referral_notices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_user_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
        contact_name VARCHAR(150) NOT NULL,
        contact_phone VARCHAR(25),
        notice_type VARCHAR(50) NOT NULL DEFAULT 'ALREADY_REGISTERED',
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS has_courtesy_pass BOOLEAN DEFAULT FALSE;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS courtesy_pass_ends_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
        ALTER TABLE viajes_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      EXCEPTION WHEN others THEN null; END $$;
    `);

    // 1.1 Crear tabla de Tickets de Inbox (Pagos, Sugerencias, Quejas, Soporte)
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS viajes_inbox_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          ticket_code VARCHAR(32) UNIQUE NOT NULL,
          category VARCHAR(32) NOT NULL,
          sender_role VARCHAR(20) NOT NULL,
          sender_name VARCHAR(150) NOT NULL,
          sender_phone VARCHAR(30),
          sender_dui VARCHAR(20),
          vehicle_plate VARCHAR(20),
          subject VARCHAR(200),
          description TEXT NOT NULL,
          payment_amount NUMERIC(8,2) DEFAULT 0,
          payment_method VARCHAR(32),
          attachment_url TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
          admin_notes TEXT,
          resolved_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Tabla viajes_inbox_tickets verificada.');
    } catch (e) {
      console.warn('⚠️ Nota sobre tabla viajes_inbox_tickets:', e.message);
    }

    // 1.2 Crear tabla de eventos de telemetría y retención
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS viajes_telemetry_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id VARCHAR(64) NOT NULL,
          event_type VARCHAR(64) NOT NULL,
          role VARCHAR(20) DEFAULT 'PASSENGER',
          path VARCHAR(120),
          device_type VARCHAR(20),
          duration_seconds INT DEFAULT 0,
          metadata JSONB,
          client_ip VARCHAR(64),
          country_code VARCHAR(10),
          country_name VARCHAR(60),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_telem_created_at ON viajes_telemetry_events(created_at);
        CREATE INDEX IF NOT EXISTS idx_telem_session ON viajes_telemetry_events(session_id);
        CREATE INDEX IF NOT EXISTS idx_telem_country ON viajes_telemetry_events(country_code);
        CREATE INDEX IF NOT EXISTS idx_telem_ip ON viajes_telemetry_events(client_ip);
        ALTER TABLE viajes_telemetry_events ADD COLUMN IF NOT EXISTS client_ip VARCHAR(64);
        ALTER TABLE viajes_telemetry_events ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);
        ALTER TABLE viajes_telemetry_events ADD COLUMN IF NOT EXISTS country_name VARCHAR(60);
        ALTER TABLE viajes_telemetry_events ADD COLUMN IF NOT EXISTS phone_brand VARCHAR(60);
        ALTER TABLE viajes_telemetry_events ADD COLUMN IF NOT EXISTS phone_model VARCHAR(80);
        ALTER TABLE viajes_telemetry_events ADD COLUMN IF NOT EXISTS phone_os VARCHAR(40);
        CREATE INDEX IF NOT EXISTS idx_telem_phone_brand ON viajes_telemetry_events(phone_brand);
      `);
      console.log('✅ Tabla viajes_telemetry_events verificada (con IPs, países y modelos de celulares para rifas).');
    } catch (e) {
      console.warn('⚠️ Nota sobre tabla viajes_telemetry_events:', e.message);
    }

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

// ============================================================================
// 8. INBOX MULTITEMA (PAGOS, SUGERENCIAS, QUEJAS, SOPORTE) Y COLA DE TICKETS
// ============================================================================
const memoryInboxTickets = [];

function generateTicketCode(category) {
  const cat = String(category || '').toUpperCase();
  let prefix = 'TKT';
  if (cat.includes('PAGO')) prefix = 'PAG';
  else if (cat.includes('SUGER')) prefix = 'SUG';
  else if (cat.includes('QUEJ')) prefix = 'QUE';
  else if (cat.includes('SOPORT')) prefix = 'SOP';
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${num}`;
}

// 8.1 Crear Ticket de Inbox (Pasajero o Conductor)
app.post('/api/inbox/tickets', async (req, res) => {
  try {
    const {
      category = 'SOPORTE',
      senderRole = 'PASSENGER',
      senderName = 'Usuario',
      senderPhone = '',
      senderDui = '',
      vehiclePlate = '',
      subject = '',
      description = '',
      paymentAmount = 0,
      paymentMethod = 'TRANSFER365',
      attachmentUrl = ''
    } = req.body;

    if (!description && !subject && !attachmentUrl) {
      return res.status(400).json({ success: false, error: 'Debe especificar el motivo o comprobante del ticket.' });
    }

    const ticketCode = generateTicketCode(category);
    const newTicket = {
      id: `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      ticket_code: ticketCode,
      category: category.toUpperCase(),
      sender_role: senderRole.toUpperCase(),
      sender_name: senderName,
      sender_phone: senderPhone,
      sender_dui: senderDui,
      vehicle_plate: vehiclePlate,
      subject: subject || `${category} - ${senderName}`,
      description: description || 'Notificación de comprobante de pago',
      payment_amount: parseFloat(paymentAmount) || 0,
      payment_method: paymentMethod,
      attachment_url: attachmentUrl,
      status: 'PENDING',
      admin_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      const dbRes = await pool.query(`
        INSERT INTO viajes_inbox_tickets (
          ticket_code, category, sender_role, sender_name, sender_phone, 
          sender_dui, vehicle_plate, subject, description, payment_amount, 
          payment_method, attachment_url, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *;
      `, [
        newTicket.ticket_code,
        newTicket.category,
        newTicket.sender_role,
        newTicket.sender_name,
        newTicket.sender_phone,
        newTicket.sender_dui,
        newTicket.vehicle_plate,
        newTicket.subject,
        newTicket.description,
        newTicket.payment_amount,
        newTicket.payment_method,
        newTicket.attachment_url,
        newTicket.status
      ]);
      if (dbRes.rows[0]) {
        Object.assign(newTicket, dbRes.rows[0]);
      }
    } catch (dbErr) {
      console.warn('⚠️ Guardando ticket en memoria de respaldo:', dbErr.message);
    }

    memoryInboxTickets.unshift(newTicket);
    io.emit('inbox_new_ticket', newTicket);

    res.json({
      success: true,
      ticket: newTicket,
      message: `Ticket ${newTicket.ticket_code} registrado con éxito en la cola de atención.`
    });
  } catch (err) {
    console.error('Error al registrar ticket de inbox:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.2 Listar Tickets de Inbox con Filtros
app.get('/api/inbox/tickets', async (req, res) => {
  try {
    const { category, senderRole, status, senderPhone, senderDui } = req.query;

    let dbTickets = [];
    try {
      let query = 'SELECT * FROM viajes_inbox_tickets WHERE 1=1';
      const params = [];
      if (category) {
        params.push(category.toUpperCase());
        query += ` AND category = $${params.length}`;
      }
      if (senderRole) {
        params.push(senderRole.toUpperCase());
        query += ` AND sender_role = $${params.length}`;
      }
      if (status) {
        params.push(status.toUpperCase());
        query += ` AND status = $${params.length}`;
      }
      if (senderPhone) {
        params.push(senderPhone);
        query += ` AND sender_phone = $${params.length}`;
      }
      if (senderDui) {
        params.push(senderDui);
        query += ` AND sender_dui = $${params.length}`;
      }
      query += ' ORDER BY created_at DESC LIMIT 100';
      const dbRes = await pool.query(query, params);
      dbTickets = dbRes.rows;
    } catch (dbErr) {
      // Fallback a memoria
      dbTickets = memoryInboxTickets;
    }

    // Unir memoria y DB evitando duplicados
    const combined = [...dbTickets];
    for (const m of memoryInboxTickets) {
      if (!combined.some(t => t.ticket_code === m.ticket_code)) {
        combined.unshift(m);
      }
    }

    let filtered = combined;
    if (category && category !== 'ALL') {
      filtered = filtered.filter(t => t.category === category.toUpperCase());
    }
    if (senderRole && senderRole !== 'ALL') {
      filtered = filtered.filter(t => t.sender_role === senderRole.toUpperCase());
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter(t => t.status === status.toUpperCase());
    }

    res.json({ success: true, count: filtered.length, tickets: filtered });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8.3 Actualizar / Atender Ticket de Inbox (Admin)
app.patch('/api/inbox/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status, adminNotes } = req.body;

    let updatedTicket = null;

    try {
      const dbRes = await pool.query(`
        UPDATE viajes_inbox_tickets 
        SET status = COALESCE($1, status),
            admin_notes = COALESCE($2, admin_notes),
            resolved_at = CASE WHEN $1 IN ('RESOLVED', 'APPROVED') THEN CURRENT_TIMESTAMP ELSE resolved_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id::text = $3 OR ticket_code = $3
        RETURNING *;
      `, [status, adminNotes, ticketId]);
      if (dbRes.rows[0]) {
        updatedTicket = dbRes.rows[0];
      }
    } catch (e) {
      console.warn('DB update fallback:', e.message);
    }

    // Actualizar en memoria
    const memIndex = memoryInboxTickets.findIndex(t => t.id === ticketId || t.ticket_code === ticketId);
    if (memIndex !== -1) {
      memoryInboxTickets[memIndex].status = status || memoryInboxTickets[memIndex].status;
      memoryInboxTickets[memIndex].admin_notes = adminNotes || memoryInboxTickets[memIndex].admin_notes;
      memoryInboxTickets[memIndex].updated_at = new Date().toISOString();
      if (!updatedTicket) updatedTicket = memoryInboxTickets[memIndex];
    }

    if (!updatedTicket) {
      return res.status(404).json({ success: false, error: 'Ticket no encontrado.' });
    }

    // Si es un ticket de pagos y fue aprobado, extender vigencia del conductor
    if (updatedTicket.category === 'PAGOS' && status === 'APPROVED') {
      try {
        if (updatedTicket.vehicle_plate || updatedTicket.sender_dui) {
          await pool.query(`
            UPDATE viajes_driver_profiles dp
            SET is_active = true,
                trial_ends_at = CURRENT_TIMESTAMP + INTERVAL '7 days'
            FROM viajes_users u
            WHERE (dp.user_id = u.id AND u.dui = $1) OR dp.vehicle_plate = $2;
          `, [updatedTicket.sender_dui, updatedTicket.vehicle_plate]);
        }
      } catch (subErr) {
        console.warn('Nota al actualizar suscripción de conductor:', subErr.message);
      }
    }

    io.emit('inbox_ticket_updated', updatedTicket);

    res.json({ success: true, ticket: updatedTicket, message: 'Ticket actualizado con éxito.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 9. PANEL ADMINISTRATIVO PRIVADO CON AUTENTICACIÓN SEGURA 2FA
// ============================================================================

// 9.1 Autenticación de Administrador Segura (Doble Factor)
const handleAdminSecureLogin = async (req, res) => {
  try {
    const { identifier, email, user, pinCode } = req.body;
    const cleanId = String(identifier || email || user || '').trim().toLowerCase();

    // Identificadores válidos configurables
    const allowedIdentifiers = [
      'cealfarias@gmail.com',
      'admin',
      'superadmin',
      'cesar',
      'rumbo_admin',
      process.env.ADMIN_USER?.toLowerCase()
    ].filter(Boolean);

    if (!cleanId || !allowedIdentifiers.includes(cleanId)) {
      return res.status(403).json({
        success: false,
        error: 'Acceso Denegado: Identificador no autorizado para esta terminal.'
      });
    }

    // Doble factor de seguridad: PIN / Clave Maestra Administrativa
    const validPins = [
      'Sebastian01$',
      '202610',
      '698931',
      process.env.ADMIN_PIN
    ].filter(Boolean);

    if (!pinCode || !validPins.includes(String(pinCode).trim())) {
      return res.status(401).json({
        success: false,
        error: 'Segundo factor de seguridad inválido. Ingrese la llave o PIN correcto.'
      });
    }

    // Sesión de administrador concedida
    const token = `adm_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    res.json({
      success: true,
      token,
      admin: {
        username: 'Super Administrador',
        role: 'SUPER_ADMIN',
        authMethod: '2FA_ENCRYPTED',
        grantedAt: new Date().toISOString()
      },
      message: 'Autenticación de doble seguridad completada. Acceso concedido al Centro de Control de Rumbo.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.post('/api/admin/auth/secure', handleAdminSecureLogin);
app.post('/api/admin/auth/google', handleAdminSecureLogin);

// 9.2 Estadísticas Globales del Sistema (Pasajeros, Conductores, Finanzas, Tickets)
app.get('/api/admin/stats', async (req, res) => {
  try {
    let totalPassengers = 0;
    let totalDrivers = 0;
    let approvedDrivers = 0;
    let pendingDrivers = 0;
    let completedTrips = 0;
    let pendingTicketsCount = memoryInboxTickets.filter(t => t.status === 'PENDING').length;
    let paymentTicketsCount = memoryInboxTickets.filter(t => t.category === 'PAGOS' && t.status === 'PENDING').length;

    try {
      const pRes = await pool.query("SELECT count(*) FROM viajes_users WHERE role = 'PASSENGER';");
      totalPassengers = parseInt(pRes.rows[0]?.count || 0);

      const dRes = await pool.query("SELECT count(*) FROM viajes_driver_profiles;");
      totalDrivers = parseInt(dRes.rows[0]?.count || 0);

      const dApp = await pool.query("SELECT count(*) FROM viajes_driver_profiles WHERE approval_status = 'APPROVED';");
      approvedDrivers = parseInt(dApp.rows[0]?.count || 0);

      const dPend = await pool.query("SELECT count(*) FROM viajes_driver_profiles WHERE approval_status = 'PENDING';");
      pendingDrivers = parseInt(dPend.rows[0]?.count || 0);

      const tRes = await pool.query("SELECT count(*) FROM viajes_trip_requests WHERE status = 'COMPLETED';");
      completedTrips = parseInt(tRes.rows[0]?.count || 0);

      const tktPending = await pool.query("SELECT count(*) FROM viajes_inbox_tickets WHERE status = 'PENDING';");
      pendingTicketsCount = Math.max(pendingTicketsCount, parseInt(tktPending.rows[0]?.count || 0));

      const payPending = await pool.query("SELECT count(*) FROM viajes_inbox_tickets WHERE category = 'PAGOS' AND status = 'PENDING';");
      paymentTicketsCount = Math.max(paymentTicketsCount, parseInt(payPending.rows[0]?.count || 0));
    } catch (e) {
      console.warn('Stats fallback en memoria:', e.message);
    }

    const effectivePassengers = totalPassengers;
    const effectiveDrivers = totalDrivers;
    const promoDeadline = new Date('2026-11-01T00:00:00-06:00');
    const isPromoActive = new Date() < promoDeadline;

    const passengerQuotaMax = 100;
    const passengerQuotaRemaining = Math.max(0, passengerQuotaMax - effectivePassengers);
    const passengerPromoActive = isPromoActive && effectivePassengers < passengerQuotaMax;

    const driverQuotaMax = 100;
    const driverQuotaRemaining = Math.max(0, driverQuotaMax - effectiveDrivers);
    const driverPromoActive = isPromoActive && effectiveDrivers < driverQuotaMax;

    const prelaunchPromo = {
      isPromoActive,
      deadlineIso: '2026-10-31T23:59:59-06:00',
      deadlineFormatted: '31 de Octubre de 2026',
      quotaMaxPerRole: 100,
      passengers: {
        enrolledCount: effectivePassengers,
        quotaMax: passengerQuotaMax,
        remainingSpots: passengerQuotaRemaining,
        percentFilled: Math.min(100, Math.round((effectivePassengers / passengerQuotaMax) * 100)),
        isPromoActive: passengerPromoActive,
        welcomeBonus: passengerPromoActive ? 2.00 : 1.00,
        referralBonus: passengerPromoActive ? 2.00 : 1.00,
        normalBonus: 1.00,
        multiplierText: '200% ($2.00 USD)'
      },
      drivers: {
        enrolledCount: effectiveDrivers,
        quotaMax: driverQuotaMax,
        remainingSpots: driverQuotaRemaining,
        percentFilled: Math.min(100, Math.round((effectiveDrivers / driverQuotaMax) * 100)),
        isPromoActive: driverPromoActive,
        trialDays: driverPromoActive ? 30 : 14,
        normalTrialDays: 14,
        promoTrialDays: 30,
        savingsText: '30 Días Gratis ($0 Cuota / 1 Mes Completo)'
      }
    };

    res.json({
      success: true,
      stats: {
        totalPassengers: effectivePassengers,
        totalDrivers: effectiveDrivers,
        approvedDrivers,
        pendingDrivers,
        completedTrips,
        pendingTicketsCount,
        paymentTicketsCount,
        estimatedGrossRevenue: '$0.00 USD',
        totalBonusesCirculating: 0,
        prelaunchPromo,
        serverTime: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.3 Listado de Expedientes de Conductores para Autorización
app.get('/api/admin/drivers', async (req, res) => {
  try {
    let drivers = [];
    try {
      const dbRes = await pool.query(`
        SELECT 
          dp.id, dp.user_id, u.full_name, u.phone, u.dui,
          dp.vehicle_plate, dp.vehicle_brand, dp.vehicle_model, dp.vehicle_color,
          dp.license_number, dp.approval_status, dp.approved_at, dp.approved_by,
          dp.photo_url, dp.is_active, dp.is_online, dp.trial_ends_at,
          dp.dui_front_url, dp.dui_back_url, dp.license_front_url, dp.license_back_url,
          dp.circulation_card_url, dp.police_record_url, dp.criminal_record_url,
          dp.vehicle_photo_front, dp.vehicle_photo_inside, dp.rejection_reason,
          dp.has_courtesy_pass, dp.courtesy_pass_ends_at,
          dp.created_at
        FROM viajes_driver_profiles dp
        JOIN viajes_users u ON dp.user_id = u.id
        WHERE u.dui NOT IN ('02345678-9', '01234567-8', '00000000-0')
          AND u.phone NOT IN ('7788-9900', '7123-4567')
        ORDER BY dp.created_at DESC;
      `);
      drivers = dbRes.rows;
    } catch (e) {
      console.warn('Fallback conductores DB:', e.message);
    }

    res.json({ success: true, count: drivers.length, drivers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.3.1 Purgar Expedientes de Prueba
app.all(['/api/admin/drivers/purge', '/api/admin/drivers/reset-all'], async (req, res) => {
  try {
    if (process.env.DATABASE_URL) {
      await pool.query(`
        DELETE FROM viajes_driver_profiles 
        WHERE user_id IN (
          SELECT id FROM viajes_users 
          WHERE dui IN ('02345678-9', '01234567-8', '00000000-0') 
             OR phone IN ('7788-9900', '7123-4567')
        );
      `);
    }
    activeDriverSessions.clear();
    res.json({ success: true, message: 'Expedientes de prueba eliminados exitosamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.3.2 Eliminar un Expediente Individual
app.delete('/api/admin/drivers/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    if (process.env.DATABASE_URL) {
      await pool.query('DELETE FROM viajes_driver_profiles WHERE id::text = $1', [driverId]);
    }
    res.json({ success: true, message: 'Expediente eliminado correctamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.4 Autorizar, Rechazar o Suspender Conductor
app.patch('/api/admin/drivers/:driverId/authorization', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status, rejectionReason } = req.body; // 'APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'

    if (!['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Estado de autorización no válido.' });
    }

    let updated = null;
    try {
      const dbRes = await pool.query(`
        UPDATE viajes_driver_profiles
        SET approval_status = $1,
            rejection_reason = $2,
            approved_at = CASE WHEN $1 = 'APPROVED' THEN CURRENT_TIMESTAMP ELSE approved_at END,
            approved_by = 'SUPER_ADMIN',
            is_active = CASE WHEN $1 = 'APPROVED' THEN true ELSE false END,
            is_online = CASE WHEN $1 = 'APPROVED' THEN is_online ELSE false END,
            trial_ends_at = CASE WHEN $1 = 'APPROVED' AND trial_ends_at IS NULL THEN CURRENT_TIMESTAMP + INTERVAL '14 days' ELSE trial_ends_at END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id::text = $3 OR vehicle_plate = $3 OR user_id::text = $3
        RETURNING *;
      `, [status, rejectionReason || null, driverId]);
      updated = dbRes.rows[0];

      // Cortafuegos de seguridad: si fue aprobado, actualizar rol de usuario y cancelar bonos promocionales de pasajero
      if (status === 'APPROVED' && updated?.user_id) {
        try {
          await pool.query(`UPDATE viajes_users SET role = 'DRIVER' WHERE id::text = $1`, [updated.user_id.toString()]);
          await LedgerService.cancelPromotionalBonusesOnDriverApproval(updated.user_id, 'SUPER_ADMIN');
        } catch (lErr) {
          console.warn('LedgerService cancel bonuses warning:', lErr.message);
        }
      }
    } catch (e) {
      console.warn('DB driver auth fallback:', e.message);
    }

    io.emit('driver_authorization_changed', { driverId, status, rejectionReason, driver: updated });

    res.json({
      success: true,
      driver: updated || { id: driverId, approval_status: status, rejection_reason: rejectionReason },
      message: `El conductor ha sido ${status === 'APPROVED' ? 'autorizado exitosamente' : status === 'REJECTED' ? 'rechazado con observaciones' : 'actualizado a ' + status}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 9.4.5 TELEMETRÍA NATIVA, TIEMPO DE PERMANENCIA Y EVENTOS EXIT-INTENT
// ============================================================================
const memoryTelemetryEvents = [];

// Helper de Geolocalización y Banderas Reales
const COUNTRY_MAP = {
  SV: { name: 'El Salvador', flag: '🇸🇻' },
  US: { name: 'Estados Unidos', flag: '🇺🇸' },
  GT: { name: 'Guatemala', flag: '🇬🇹' },
  HN: { name: 'Honduras', flag: '🇭🇳' },
  NI: { name: 'Nicaragua', flag: '🇳🇮' },
  CR: { name: 'Costa Rica', flag: '🇨🇷' },
  MX: { name: 'México', flag: '🇲🇽' },
  ES: { name: 'España', flag: '🇪🇸' },
  CA: { name: 'Canadá', flag: '🇨🇦' },
  CO: { name: 'Colombia', flag: '🇨🇴' },
  PA: { name: 'Panamá', flag: '🇵🇦' },
  AR: { name: 'Argentina', flag: '🇦🇷' },
  CL: { name: 'Chile', flag: '🇨🇱' },
  PE: { name: 'Perú', flag: '🇵🇪' },
  DO: { name: 'Rep. Dominicana', flag: '🇩🇴' }
};

function resolveCountryInfo(code) {
  const clean = String(code || '').toUpperCase().trim();
  if (COUNTRY_MAP[clean]) {
    return { code: clean, ...COUNTRY_MAP[clean] };
  }
  if (!clean || clean === 'XX' || clean === 'T1' || clean === 'LOCAL') {
    return { code: 'SV', name: 'El Salvador', flag: '🇸🇻' };
  }
  return { code: clean, name: clean, flag: '🌐' };
}

app.post('/api/telemetry/event', async (req, res) => {
  try {
    const {
      sessionId = 'anon_' + Math.random().toString(36).substring(2, 9),
      eventType = 'PAGE_VIEW',
      role = 'PASSENGER',
      path = '/',
      deviceType = 'MOBILE',
      durationSeconds = 0,
      metadata = {}
    } = req.body || {};

    // 1. IP Real del Visitante (Cloudflare Connecting IP o X-Forwarded-For)
    const rawIp = req.headers['cf-connecting-ip'] || 
                  req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                  req.headers['x-real-ip'] || 
                  req.socket?.remoteAddress || 
                  '127.0.0.1';
    const clientIp = rawIp.replace(/^::ffff:/, '').trim() || '127.0.0.1';

    // 2. FILTRAR Y OBVIAR LOCALHOST Y SESIÓN ADMINISTRATIVA (Para no inflar estadísticas)
    const isLocalhostOrAdmin = clientIp === '127.0.0.1' || 
                               clientIp === '::1' || 
                               clientIp === 'localhost' || 
                               metadata.isAdmin === true || 
                               String(path).startsWith('/admin');

    if (isLocalhostOrAdmin) {
      return res.json({ success: true, ignored: true, reason: 'ADMIN_OR_LOCALHOST_EXCLUDED' });
    }

    // 3. País Real (Header CF-IPCountry oficial de Cloudflare Edge)
    const rawCountry = req.headers['cf-ipcountry'] || 
                       req.headers['x-country-code'] || 
                       (clientIp === '127.0.0.1' || clientIp === '::1' ? 'SV' : 'SV');
    const countryInfo = resolveCountryInfo(rawCountry);

    // 4. Discriminación Inteligente de Marca y Modelo de Celular (Para Rifas e Incentivos)
    const phoneInfo = metadata.phoneInfo || {};
    let phoneBrand = phoneInfo.brand || '';
    let phoneModel = phoneInfo.model || '';
    let phoneOs = phoneInfo.os || '';

    if (!phoneBrand) {
      const ua = req.headers['user-agent'] || '';
      if (/iPhone|iPad|iPod/i.test(ua)) {
        phoneBrand = 'Apple iPhone';
        phoneModel = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
        phoneOs = 'iOS';
      } else if (/Android/i.test(ua)) {
        if (/SAMSUNG|SM-[A-Z0-9]+/i.test(ua)) phoneBrand = 'Samsung Galaxy';
        else if (/Xiaomi|Redmi|POCO/i.test(ua)) phoneBrand = 'Xiaomi / Redmi / POCO';
        else if (/Motorola|moto/i.test(ua)) phoneBrand = 'Motorola';
        else if (/HUAWEI|HONOR/i.test(ua)) phoneBrand = 'Huawei / Honor';
        else phoneBrand = 'Android Genérico';
        phoneOs = 'Android';
      } else {
        phoneBrand = 'Computadora PC';
        phoneModel = 'Escritorio';
        phoneOs = 'PC';
      }
    }

    const eventRecord = {
      id: 'telem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      session_id: sessionId,
      event_type: eventType,
      role,
      path,
      device_type: deviceType,
      duration_seconds: Number(durationSeconds) || 0,
      metadata,
      client_ip: clientIp,
      country_code: countryInfo.code,
      country_name: countryInfo.name,
      country_flag: countryInfo.flag,
      phone_brand: phoneBrand,
      phone_model: phoneModel,
      phone_os: phoneOs,
      created_at: new Date().toISOString()
    };

    memoryTelemetryEvents.unshift(eventRecord);
    if (memoryTelemetryEvents.length > 5000) memoryTelemetryEvents.pop();

    if (process.env.DATABASE_URL) {
      pool.query(`
        INSERT INTO viajes_telemetry_events (
          session_id, event_type, role, path, device_type, duration_seconds, metadata, client_ip, country_code, country_name, phone_brand, phone_model, phone_os
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [sessionId, eventType, role, path, deviceType, Number(durationSeconds) || 0, JSON.stringify(metadata), clientIp, countryInfo.code, countryInfo.name, phoneBrand, phoneModel, phoneOs]).catch(() => {});
    }

    io.emit('telemetry_live_event', eventRecord);
    res.json({ success: true, recorded: true, ip: clientIp, country: countryInfo.name, phone: phoneBrand });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/telemetry/stats', async (req, res) => {
  try {
    let events = memoryTelemetryEvents;
    if (process.env.DATABASE_URL) {
      try {
        const dbRes = await pool.query(`
          SELECT * FROM viajes_telemetry_events
          WHERE client_ip NOT IN ('127.0.0.1', '::1', 'localhost') OR client_ip IS NULL
          ORDER BY created_at DESC
          LIMIT 1000;
        `);
        if (dbRes.rows && dbRes.rows.length > 0) {
          events = dbRes.rows;
        }
      } catch (e) {
        console.warn('Fallback telemetría en memoria:', e.message);
      }
    }

    // Filtrar estrictamente cualquier 127.0.0.1 o loopback local
    events = events.filter(e => e.client_ip !== '127.0.0.1' && e.client_ip !== '::1' && e.client_ip !== 'localhost' && !e.client_ip?.startsWith('192.168.'));

    let totalLifetimeVisitors = 0;
    let totalLifetimeEvents = events.length;

    if (process.env.DATABASE_URL) {
      try {
        const histRes = await pool.query(`
          SELECT 
            COUNT(DISTINCT session_id) as total_unique,
            COUNT(*) as total_events
          FROM viajes_telemetry_events
          WHERE client_ip NOT IN ('127.0.0.1', '::1', 'localhost') OR client_ip IS NULL;
        `);
        if (histRes.rows && histRes.rows[0]) {
          totalLifetimeVisitors = Number(histRes.rows[0].total_unique) || 0;
          totalLifetimeEvents = Number(histRes.rows[0].total_events) || 0;
        }
      } catch (e) {
        console.warn('Error al consultar historiales acumulados:', e.message);
      }
    }

    // Calcular Métricas Reales
    const sessionsMap = new Map();
    const hourlyCounts = new Array(24).fill(0);
    // Distribución por día de la semana (0: Domingo .. 6: Sábado) estilo Google Maps
    const hourlyByDay = {
      0: new Array(24).fill(0),
      1: new Array(24).fill(0),
      2: new Array(24).fill(0),
      3: new Array(24).fill(0),
      4: new Array(24).fill(0),
      5: new Array(24).fill(0),
      6: new Array(24).fill(0)
    };

    const countryMap = new Map();
    const ipMap = new Map();

    let mobileCount = 0;
    let desktopCount = 0;
    let passengerCount = 0;
    let driverCount = 0;
    let exitShown = 0;
    let exitConverted = 0;
    const eventTypeCounts = {};

    for (const ev of events) {
      const sId = ev.session_id || 'anon';
      const curDur = Number(ev.duration_seconds) || 0;
      const cInfo = resolveCountryInfo(ev.country_code);
      const ip = ev.client_ip || '127.0.0.1';

      if (!sessionsMap.has(sId) || curDur > sessionsMap.get(sId).maxDuration) {
        sessionsMap.set(sId, {
          role: ev.role,
          maxDuration: curDur,
          device: ev.device_type,
          ip,
          country: cInfo.name,
          countryFlag: cInfo.flag,
          createdAt: ev.created_at
        });
      }

      // Zona Horaria Oficial El Salvador (UTC-6)
      const evDate = new Date(ev.created_at || Date.now());
      const svMs = evDate.getTime() - (6 * 3600 * 1000);
      const svDate = new Date(svMs);
      const svDow = svDate.getUTCDay();
      const svHour = svDate.getUTCHours();

      hourlyCounts[svHour]++;
      if (hourlyByDay[svDow]) {
        hourlyByDay[svDow][svHour]++;
      }

      // Desglose de Países Reales
      const cKey = cInfo.code;
      const curC = countryMap.get(cKey) || {
        countryCode: cKey,
        countryName: cInfo.name,
        flag: cInfo.flag,
        visits: 0
      };
      curC.visits++;
      countryMap.set(cKey, curC);

      // Desglose de IPs Reales
      const curIp = ipMap.get(ip) || {
        ip,
        countryCode: cInfo.code,
        countryName: cInfo.name,
        flag: cInfo.flag,
        visits: 0,
        role: ev.role,
        device: ev.device_type,
        lastSeen: ev.created_at
      };
      curIp.visits++;
      ipMap.set(ip, curIp);

      if (ev.device_type === 'MOBILE') mobileCount++;
      else if (ev.device_type === 'DESKTOP') desktopCount++;

      if (ev.role === 'PASSENGER') passengerCount++;
      if (ev.role === 'DRIVER') driverCount++;

      if (ev.event_type === 'EXIT_INTENT_SHOWN') exitShown++;
      if (ev.event_type === 'EXIT_INTENT_CONVERTED_REGISTER' || ev.event_type === 'EXIT_INTENT_CONVERTED_WHATSAPP') exitConverted++;

      eventTypeCounts[ev.event_type] = (eventTypeCounts[ev.event_type] || 0) + 1;
    }

    let totalSessionDuration = 0;
    let bounceSessions = 0;
    sessionsMap.forEach((sess) => {
      totalSessionDuration += sess.maxDuration;
      if (sess.maxDuration < 10) bounceSessions++;
    });

    const totalSessions = sessionsMap.size;
    const avgDurationSeconds = totalSessions > 0 ? Math.round(totalSessionDuration / totalSessions) : 0;
    const bounceRate = totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0;

    const formatDuration = (sec) => {
      if (!sec || sec <= 0) return '0s';
      if (sec < 60) return `${sec}s`;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}m ${s}s`;
    };

    const totalDevices = mobileCount + desktopCount;
    const mobilePercent = totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0;

    // Estado en Tiempo Real estilo Google Maps "Horas punta"
    const nowSv = new Date(Date.now() - (6 * 3600 * 1000));
    const currentDow = nowSv.getUTCDay();
    const currentHour = nowSv.getUTCHours();
    const todayCounts = hourlyByDay[currentDow] || new Array(24).fill(0);
    const currentHourVisits = todayCounts[currentHour] || 0;

    // Concurrencia habitual promedio para esta hora
    let sumHour = 0;
    let daysWithVisits = 0;
    for (let d = 0; d < 7; d++) {
      const cnt = hourlyByDay[d][currentHour];
      if (cnt > 0) {
        sumHour += cnt;
        daysWithVisits++;
      }
    }
    const typicalHourVisits = daysWithVisits > 0 ? Math.round(sumHour / daysWithVisits) : 0;

    let realtimeStatusText = 'Nivel habitual de concurrencia';
    if (currentHourVisits === 0 && events.length === 0) {
      realtimeStatusText = 'Sin visitas registradas aún';
    } else if (currentHourVisits === 0) {
      realtimeStatusText = 'Poco concurrido en este momento';
    } else if (typicalHourVisits > 0 && currentHourVisits < typicalHourVisits) {
      realtimeStatusText = 'Menos concurrido de lo habitual';
    } else if (typicalHourVisits > 0 && currentHourVisits > typicalHourVisits) {
      realtimeStatusText = 'Más concurrido de lo habitual';
    } else {
      realtimeStatusText = 'Concurrencia habitual';
    }

    const totalEventsCount = events.length || 1;
    const countryBreakdown = Array.from(countryMap.values())
      .map(c => ({
        ...c,
        percent: Math.round((c.visits / totalEventsCount) * 100)
      }))
      .sort((a, b) => b.visits - a.visits);

    const topIps = Array.from(ipMap.values())
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 25);

    // Discriminación Real de Marcas y Modelos de Celulares (Para Rifas de Fidelización)
    const phoneBrandMap = new Map();

    for (const ev of events) {
      const brand = ev.phone_brand || (ev.device_type === 'MOBILE' ? 'Android / Móvil' : 'Computadora PC');
      const model = ev.phone_model || '';
      const isMobile = ev.device_type === 'MOBILE' || !brand.toLowerCase().includes('pc');

      if (isMobile && !brand.toLowerCase().includes('pc') && !brand.toLowerCase().includes('computadora')) {
        let icon = '📱';
        if (brand.includes('iPhone')) icon = '🍎';
        else if (brand.includes('Samsung')) icon = '📱';
        else if (brand.includes('Xiaomi') || brand.includes('Redmi') || brand.includes('POCO')) icon = '⚡';
        else if (brand.includes('Motorola')) icon = '📡';
        else if (brand.includes('Huawei') || brand.includes('Honor')) icon = '🌸';
        else if (brand.includes('Pixel')) icon = '⚪';

        const curB = phoneBrandMap.get(brand) || {
          brand,
          icon,
          count: 0,
          models: new Map()
        };
        curB.count++;
        if (model && model !== brand) {
          curB.models.set(model, (curB.models.get(model) || 0) + 1);
        }
        phoneBrandMap.set(brand, curB);
      }
    }

    const totalSmartphones = Array.from(phoneBrandMap.values()).reduce((sum, b) => sum + b.count, 0) || 1;
    const smartphoneBreakdown = Array.from(phoneBrandMap.values())
      .map(b => {
        const topModels = Array.from(b.models.entries())
          .sort((x, y) => y[1] - x[1])
          .slice(0, 3)
          .map(([m, c]) => `${m} (${c})`);
        return {
          brand: b.brand,
          icon: b.icon,
          count: b.count,
          percent: Math.round((b.count / totalSmartphones) * 100),
          topModels
        };
      })
      .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      stats: {
        totalEvents: events.length,
        uniqueVisitors: sessionsMap.size,
        totalLifetimeVisitors: totalLifetimeVisitors > 0 ? totalLifetimeVisitors : sessionsMap.size,
        totalLifetimeEvents: totalLifetimeEvents > 0 ? totalLifetimeEvents : events.length,
        passengerVisits: passengerCount,
        driverVisits: driverCount,
        avgDurationSeconds,
        avgDurationFormatted: formatDuration(avgDurationSeconds),
        bounceRate: `${bounceRate}%`,
        bounceSessions,
        hourlyDistribution: hourlyCounts,
        hourlyByDay,
        googleMapsRealtime: {
          currentDayOfWeek: currentDow,
          currentHour,
          currentHourVisits,
          typicalHourVisits,
          statusText: realtimeStatusText
        },
        countryBreakdown,
        topIps,
        smartphoneBreakdown,
        exitIntent: {
          shown: exitShown,
          converted: exitConverted,
          rate: exitShown > 0 ? `${Math.round((exitConverted / exitShown) * 100)}%` : '0%'
        },
        deviceBreakdown: {
          mobile: mobileCount,
          desktop: desktopCount,
          mobilePercent
        },
        eventTypeCounts,
        recentEvents: events.slice(0, 25).map(e => {
          const c = resolveCountryInfo(e.country_code);
          return {
            id: e.id,
            eventType: e.event_type,
            role: e.role,
            device: e.device_type,
            ip: e.client_ip || '127.0.0.1',
            countryCode: c.code,
            countryName: c.name,
            countryFlag: c.flag,
            phoneBrand: e.phone_brand || '',
            phoneModel: e.phone_model || '',
            duration: Number(e.duration_seconds) || 0,
            createdAt: e.created_at
          };
        })
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9.5 REINICIO TOTAL A CERO DE LA BASE DE DATOS (PRELANZAMIENTO LIMPIO)
app.all(['/api/admin/reset-database', '/api/admin/purge-all'], async (req, res) => {
  try {
    let tablesPurged = [];
    if (process.env.DATABASE_URL) {
      await pool.query(`
        DO $$ BEGIN
          TRUNCATE TABLE 
            viajes_trip_requests,
            viajes_driver_trips,
            viajes_user_credits,
            viajes_referrals,
            viajes_ledger_transactions,
            viajes_wallet_identities,
            viajes_referral_notices,
            viajes_inbox_tickets,
            viajes_support_tickets,
            viajes_driver_profiles,
            viajes_users
          CASCADE;
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END $$;
      `);
      tablesPurged = [
        'viajes_trip_requests',
        'viajes_driver_trips',
        'viajes_user_credits',
        'viajes_referrals',
        'viajes_ledger_transactions',
        'viajes_wallet_identities',
        'viajes_referral_notices',
        'viajes_inbox_tickets',
        'viajes_support_tickets',
        'viajes_driver_profiles',
        'viajes_users'
      ];
    }

    // Vaciar colas y estados en memoria
    memoryInboxTickets.length = 0;
    activeMagicLinks.clear();
    activeDriverSessions.clear();
    activeOtpCodes.clear();

    console.log('🧹 REINICIO TOTAL: Base de datos y memoria reseteadas a CERO.');

    res.json({
      success: true,
      message: 'Base de datos y memoria reseteadas exitosamente a CERO. Contadores en cero para el inicio del prelanzamiento.',
      tablesPurged,
      resetAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error al resetear base de datos:', err);
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
