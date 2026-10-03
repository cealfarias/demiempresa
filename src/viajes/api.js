import { io } from 'socket.io-client';

// URL del backend en Render Always-On
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.demiempresa.online';

// Instancia única y compartida de Socket.io con reconexión continua y keepalive
export const socket = io(API_BASE_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1500,
  timeout: 20000
});

socket.on('connect', () => {
  console.log('⚡ Conectado al Gateway WebSockets en:', API_BASE_URL);
});

socket.on('disconnect', (reason) => {
  console.warn('⚠️ Desconectado del WebSocket:', reason);
});

/**
 * 1. Registro y Validación de Usuario (Punto de Inflexión con DUI único)
 */
export async function registerUserApi({ fullName, phone, dui, role = 'PASSENGER', referrerCode }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, phone, dui, role, referrerCode })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar usuario');
    return data;
  } catch (err) {
    console.error('API Error registerUser:', err);
    throw err;
  }
}

/**
 * 2. Consulta de Créditos y Referidos (7+7 Días)
 */
export async function fetchUserCreditsApi(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/referrals/user/${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchUserCredits:', err);
    return null;
  }
}

/**
 * 2.1 Verificación en tiempo real si un contacto ya está registrado (Evitar falsa expectativa)
 */
export async function checkContactRegisteredApi({ phone, dui }) {
  try {
    const params = new URLSearchParams();
    if (phone) params.append('phone', phone);
    if (dui) params.append('dui', dui);
    const res = await fetch(`${API_BASE_URL}/api/referrals/check-contact?${params.toString()}`);
    if (!res.ok) return { isRegistered: false };
    return await res.json();
  } catch (err) {
    console.warn('API Error checkContactRegisteredApi:', err);
    return { isRegistered: false };
  }
}

/**
 * 2.2 Descartar o marcar como leído un aviso de referido ya registrado
 */
export async function dismissReferralNoticeApi({ noticeId, userId }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/referrals/notices/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ noticeId, userId })
    });
    return await res.json();
  } catch (err) {
    console.warn('API Error dismissReferralNoticeApi:', err);
    return null;
  }
}

/**
 * 3. Captación en Caliente B2B ("¿Tienes un negocio? Anúnciate aquí")
 */
export async function submitLeadApi({ businessName, whatsapp, municipality }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/b2b/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessName, whatsapp, municipality })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar lead');
    return data;
  } catch (err) {
    console.error('API Error submitLead:', err);
    throw err;
  }
}

/**
 * 4. Obtener Feed Publicitario Geocercado por Municipio de Destino
 */
export async function fetchAdFeedApi(municipality) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/b2b/feed/${encodeURIComponent(municipality || 'TODOS')}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchAdFeed:', err);
    return [];
  }
}

/**
 * 5. Consulta de Cuota Semanal del Conductor y Límite de 10 Bonos
 */
export async function fetchDriverSubscriptionApi(driverProfileId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/${driverProfileId}/subscription`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchDriverSubscription:', err);
    return null;
  }
}

/**
 * 6. Consulta de Wallet Criptográfica (Saldo, UTXOs y Caducidad de 7 Días)
 */
export async function fetchWalletSummaryApi(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/summary/${encodeURIComponent(userId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchWalletSummary:', err);
    return null;
  }
}

/**
 * 7. Historial Criptográfico de la Wallet con Hashes SHA-256
 */
export async function fetchWalletHistoryApi(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/history/${encodeURIComponent(userId)}`);
    if (!res.ok) return { transactions: [] };
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchWalletHistory:', err);
    return { transactions: [] };
  }
}

/**
 * 7.1. Listado de Invitados con Temporizador y Enlace de WhatsApp
 */
export async function fetchWalletReferralsApi(userId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/referrals/${encodeURIComponent(userId)}`);
    if (!res.ok) return { referrals: [] };
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchWalletReferrals:', err);
    return { referrals: [] };
  }
}

/**
 * 8. Transferir Bono para Pago de Carrera (Pasajero -> Conductor)
 */
export async function transferTripBonusApi({ passengerId, driverId, tripId, amount = 1.00 }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/transfer-trip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerId, driverId, tripId, amount })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al transferir bono');
    return data;
  } catch (err) {
    console.error('API Error transferTripBonus:', err);
    throw err;
  }
}

/**
 * 9. Conductor Paga Cuota Semanal ($10 Base) con Bonos Acumulados
 */
export async function payDriverWeeklyFeeWithBonusesApi({ driverId, bonusesToUse = 10, totalWeeklyFee = 10.00 }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/driver/pay-weekly-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, bonusesToUse, totalWeeklyFee })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al pagar cuota con bonos');
    return data;
  } catch (err) {
    console.error('API Error payDriverWeeklyFeeWithBonuses:', err);
    throw err;
  }
}

/**
 * 10. Conductor Canjea 1 Bono por 1 Día Gratis en la Plataforma
 */
export async function redeemDriverFreeDayApi(driverId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/driver/redeem-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al canjear día gratis');
    return data;
  } catch (err) {
    console.error('API Error redeemDriverFreeDay:', err);
    throw err;
  }
}

/**
 * 10.1 Conductor Paga Pase Diario ($3.00 Base o 3 Bonos) Válido por 24 Horas
 */
export async function payDriverDailyPassApi({ driverId, bonusesToUse = 3, totalDailyFee = 3.00 }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/driver/pay-daily-pass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId, bonusesToUse, totalDailyFee })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al pagar pase diario');
    return data;
  } catch (err) {
    console.warn('API Error payDriverDailyPassApi:', err);
    throw err;
  }
}

/**
 * 11. Auditoría Matemática de Integridad de la Cadena
 */
export async function verifyLedgerAuditApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/wallet/audit`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API Error verifyLedgerAudit:', err);
    return null;
  }
}

/**
 * 12. Registro y Envío de Expediente Digital del Conductor
 */
export async function registerDriverApi(driverData) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(driverData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al registrar conductor');
    return data;
  } catch (err) {
    console.error('API Error registerDriverApi:', err);
    throw err;
  }
}

/**
 * 13. Consulta de Estado de Aprobación del Conductor
 */
export async function fetchDriverStatusApi(driverProfileId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/drivers/${driverProfileId}/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchDriverStatusApi:', err);
    return null;
  }
}

/**
 * 14. Listado Administrativo de Expedientes de Conductores
 */
export async function fetchPendingDriversApi(status = '') {
  try {
    const url = status ? `${API_BASE_URL}/api/admin/drivers/list?status=${status}` : `${API_BASE_URL}/api/admin/drivers/list`;
    const res = await fetch(url);
    if (!res.ok) return { drivers: [] };
    return await res.json();
  } catch (err) {
    console.warn('API Error fetchPendingDriversApi:', err);
    return { drivers: [] };
  }
}

/**
 * 15. Aprobación Administrativa de Conductor
 */
export async function approveDriverApi({ userId, driverProfileId, adminId = 'ADMIN_SUPERVISOR' }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/drivers/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, driverProfileId, adminId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al aprobar conductor');
    return data;
  } catch (err) {
    console.error('API Error approveDriverApi:', err);
    throw err;
  }
}

/**
 * 16. Rechazo Administrativo con Retroalimentación
 */
export async function rejectDriverApi({ driverProfileId, userId, reason, adminId = 'ADMIN_SUPERVISOR' }) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/drivers/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverProfileId, userId, reason, adminId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al rechazar conductor');
    return data;
  } catch (err) {
    console.error('API Error rejectDriverApi:', err);
    throw err;
  }
}

