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
