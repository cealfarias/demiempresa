import { API_BASE_URL } from './api';

// Clave pública VAPID oficial para Rumbo
export const DEFAULT_VAPID_PUBLIC_KEY = 'BC7VqS4ZheyCMakrhtuQEtWmwLqJuEwO74CGJneq-uPK_y2wPuBuV-X7zzyvZ_HNliwcUK0TKRlhZGKdybHGpT8';

/**
 * Convierte clave pública Base64 URL Safe a Uint8Array (requerido por PushManager)
 */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica si el navegador soporta Service Workers y Notificaciones Push
 */
export function isPushSupported() {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

/**
 * Obtiene el estado actual del permiso en el navegador
 */
export function getPushPermissionState() {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/**
 * Obtiene la clave pública VAPID desde el backend o usa la de respaldo
 */
export async function getVapidPublicKey() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/public-key`);
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey) return data.publicKey;
    }
  } catch (err) {
    console.warn('⚠️ No se pudo obtener la clave VAPID del backend, usando clave oficial local:', err.message);
  }
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Registra el Service Worker de Rumbo
 */
export async function registerServiceWorker() {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('⚠️ Error al registrar Service Worker:', err);
    return null;
  }
}

/**
 * Solicita permiso y suscribe al dispositivo al canal Push
 * @param {Object} params
 * @param {string} params.userId - ID del usuario o conductor (o temporal)
 * @param {'PASSENGER'|'DRIVER'} params.userType - Tipo de rol
 */
export async function subscribeUserToPush({ userId, userType = 'PASSENGER' } = {}) {
  if (!isPushSupported()) {
    return { success: false, reason: 'UNSUPPORTED' };
  }

  try {
    // 1. Pedir permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'DENIED', permission };
    }

    // 2. Asegurar registro del Service Worker
    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, reason: 'SW_REGISTRATION_FAILED' };
    }

    // 3. Obtener o crear suscripción Push
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const vapidKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    // 4. Enviar suscripción al backend
    const subJson = subscription.toJSON();
    const res = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subJson,
        userId: userId || null,
        userType
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al guardar suscripción en servidor');
    }

    localStorage.setItem('rumbo_push_subscribed', 'true');
    localStorage.setItem('rumbo_push_user_type', userType);

    return { success: true, subscription: subJson };
  } catch (err) {
    console.error('❌ Error suscribiendo a notificaciones push:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Enviar una prueba inmediata de notificación push al usuario actual
 */
export async function testPushNotification({ userId, userType = 'PASSENGER' } = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        userType,
        title: 'Rumbo a mi Destino 🔔',
        body: '¡Excelente! Tus notificaciones están activadas. Te avisaremos cuando tu chofer llegue o se llene tu colectivo.'
      })
    });
    return await res.json();
  } catch (err) {
    console.warn('Error en prueba push:', err);
    return { success: false, error: err.message };
  }
}
