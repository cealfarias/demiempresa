/**
 * deviceRoleManager.js - Gestor de Rol Excluyente en Dispositivo (Rumbo)
 *
 * Regla de Oro:
 * En un mismo dispositivo solo puede estar activo UN ROL a la vez:
 * O es PASAJERO ('PASSENGER') o es CONDUCTOR ('DRIVER').
 * Son mutuamente excluyentes para garantizar transparencia, seguridad y evitar
 * conflictos operativos o auto-asignación de carreras.
 */

export const STORAGE_KEYS = {
  ACTIVE_ROLE: 'rumbo_active_device_role', // 'PASSENGER' | 'DRIVER' | null
  // Pasajero
  PASSENGER_PROFILE: 'demiempresa_passenger',
  PASSENGER_ACTIVE_SESSION: 'rumbo_passenger_active_session',
  PASSENGER_DRAFT: 'rumbo_passenger_draft',
  // Conductor
  DRIVER_PROFILE: 'rumbo_driver_profile',
  DRIVER_ACTIVE_TRIP: 'rumbo_driver_active_trip',
  DRIVER_TRIP_STATE: 'rumbo_driver_trip_state',
  DRIVER_ONLINE: 'rumbo_driver_online'
};

/**
 * Obtiene el rol activo registrado en el dispositivo
 * @returns {'PASSENGER' | 'DRIVER' | null}
 */
export function getActiveDeviceRole() {
  if (typeof window === 'undefined') return null;
  try {
    const explicitRole = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROLE);
    if (explicitRole === 'PASSENGER' || explicitRole === 'DRIVER') {
      return explicitRole;
    }

    // Detección retrospectiva por perfiles guardados
    const hasDriver = !!localStorage.getItem(STORAGE_KEYS.DRIVER_PROFILE);
    const hasPassenger = !!localStorage.getItem(STORAGE_KEYS.PASSENGER_PROFILE);

    if (hasDriver && !hasPassenger) return 'DRIVER';
    if (hasPassenger && !hasDriver) return 'PASSENGER';

    return null;
  } catch {
    return null;
  }
}

/**
 * Establece el rol exclusivo del dispositivo
 * @param {'PASSENGER' | 'DRIVER'} role
 */
export function setActiveDeviceRole(role) {
  if (typeof window === 'undefined') return;
  try {
    if (role === 'PASSENGER' || role === 'DRIVER') {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, role);
    }
  } catch (e) {
    console.warn('Error guardando rol de dispositivo:', e);
  }
}

/**
 * Verifica si el pasajero tiene una carrera o subasta activa
 * @returns {{ hasActiveTrip: boolean, reason: string | null }}
 */
export function checkPassengerPendingActivity() {
  if (typeof window === 'undefined') return { hasActiveTrip: false, reason: null };
  try {
    const rawSession = localStorage.getItem(STORAGE_KEYS.PASSENGER_ACTIVE_SESSION);
    if (!rawSession) return { hasActiveTrip: false, reason: null };

    const session = JSON.parse(rawSession);
    const sessionAge = session.savedAt ? (Date.now() - session.savedAt) : Infinity;
    const MAX_AGE = 4 * 60 * 60 * 1000; // 4 horas

    if (sessionAge > MAX_AGE) {
      localStorage.removeItem(STORAGE_KEYS.PASSENGER_ACTIVE_SESSION);
      return { hasActiveTrip: false, reason: null };
    }

    if (session.tripId || session.assignedTrip) {
      return {
        hasActiveTrip: true,
        reason: 'Tienes un viaje en curso o aceptado por un conductor.'
      };
    }

    if (session.appState === 'AUCTION') {
      return {
        hasActiveTrip: true,
        reason: 'Tienes una solicitud de viaje activa en subasta esperando conductor.'
      };
    }

    if (session.isJoinedToPool) {
      return {
        hasActiveTrip: true,
        reason: 'Estás dentro de un viaje colectivo compartido en espera de cupos.'
      };
    }

    return { hasActiveTrip: false, reason: null };
  } catch {
    return { hasActiveTrip: false, reason: null };
  }
}

/**
 * Verifica si el conductor tiene una carrera activa o está en línea
 * @returns {{ hasActiveTrip: boolean, isOnline: boolean, reason: string | null }}
 */
export function checkDriverPendingActivity() {
  if (typeof window === 'undefined') return { hasActiveTrip: false, isOnline: false, reason: null };
  try {
    const rawTrip = localStorage.getItem(STORAGE_KEYS.DRIVER_ACTIVE_TRIP);
    if (rawTrip) {
      const trip = JSON.parse(rawTrip);
      if (trip && trip.id) {
        return {
          hasActiveTrip: true,
          isOnline: true,
          reason: 'Tienes una carrera asignada actualmente en ejecución.'
        };
      }
    }

    const isOnline = localStorage.getItem(STORAGE_KEYS.DRIVER_ONLINE) === 'true';
    if (isOnline) {
      return {
        hasActiveTrip: false,
        isOnline: true,
        reason: 'Estás conectado en línea recibiendo ofertas.'
      };
    }

    return { hasActiveTrip: false, isOnline: false, reason: null };
  } catch {
    return { hasActiveTrip: false, isOnline: false, reason: null };
  }
}

/**
 * Cierra limpiamente la sesión de Conductor en el dispositivo
 */
export function purgeDriverSessionCleanly() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.DRIVER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.DRIVER_ACTIVE_TRIP);
    localStorage.removeItem(STORAGE_KEYS.DRIVER_TRIP_STATE);
    localStorage.removeItem(STORAGE_KEYS.DRIVER_ONLINE);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, 'PASSENGER');
  } catch (e) {
    console.warn('Error purgando sesión de conductor:', e);
  }
}

/**
 * Cierra limpiamente la sesión de Pasajero en el dispositivo
 */
export function purgePassengerSessionCleanly() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.PASSENGER_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.PASSENGER_ACTIVE_SESSION);
    localStorage.removeItem(STORAGE_KEYS.PASSENGER_DRAFT);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROLE, 'DRIVER');
  } catch (e) {
    console.warn('Error purgando sesión de pasajero:', e);
  }
}
