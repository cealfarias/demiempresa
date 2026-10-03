/**
 * audioWakeLockService.js
 * Mantiene la pantalla del celular encendida (Screen Wake Lock API) mientras el avatar habla
 * y gestiona eventos de bloqueo/desbloqueo de pantalla para no perder la emoción ni reiniciar desde cero.
 */

let wakeLockSentinel = null;

export async function requestScreenWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
        });
      }
      return true;
    } catch (err) {
      console.warn('Screen WakeLock no pudo ser adquirido:', err.message);
      return false;
    }
  }
  return false;
}

export async function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
    } catch {}
    wakeLockSentinel = null;
  }
}
