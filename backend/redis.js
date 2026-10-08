import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redisClient = null;
let isMock = false;

// Fallback in-memory store if Redis is unavailable in local development
class InMemoryRedisMock {
  constructor() {
    this.geoStore = new Map(); // driverId -> { lng, lat, updatedAt }
    this.keys = new Map(); // key -> { value, expiresAt }
    console.log('⚠️ Redis no detectado o URL no provista. Usando Mock In-Memory para Despacho Geoespacial.');
  }

  async geoadd(key, lng, lat, member) {
    this.geoStore.set(member, { lng: parseFloat(lng), lat: parseFloat(lat), updatedAt: Date.now() });
    return 1;
  }

  // Haversine distance in km
  _distanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async georadius(key, lng, lat, radius, unit) {
    const results = [];
    const rKm = parseFloat(radius);
    const pLat = parseFloat(lat);
    const pLng = parseFloat(lng);

    for (const [member, pos] of this.geoStore.entries()) {
      const dist = this._distanceKm(pLat, pLng, pos.lat, pos.lng);
      if (dist <= rKm) {
        results.push([member, dist.toFixed(3), [pos.lng.toString(), pos.lat.toString()]]);
      }
    }
    return results;
  }

  async set(key, value, mode, duration) {
    const expiresAt = duration ? Date.now() + (parseInt(duration) * 1000) : null;
    this.keys.set(key, { value, expiresAt });
    return 'OK';
  }

  async get(key) {
    const entry = this.keys.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.keys.delete(key);
      return null;
    }
    return entry.value;
  }

  async del(key) {
    return this.keys.delete(key) ? 1 : 0;
  }

  async eval(script, numkeys, ...args) {
    // Atomic mock logic for trip accept
    const tripLockKey = args[0];
    const driverLockKey = args[1];
    const driverId = args[2];
    const tripId = args[3];

    const currentLock = await this.get(tripLockKey);
    if (currentLock && currentLock !== 'AVAILABLE') {
      return [0, 'TRIP_ALREADY_TAKEN'];
    }

    await this.set(tripLockKey, 'ASSIGNED', 'EX', 3600);
    await this.set(driverLockKey, tripId, 'EX', 3600);
    return [1, 'SUCCESS'];
  }
}

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy(times) {
        if (times > 3) {
          console.warn('⚠️ No se pudo reconectar a Redis. Conmutando a Mock.');
          isMock = true;
          redisClient = new InMemoryRedisMock();
          return null;
        }
        return Math.min(times * 100, 2000);
      }
    });

    redisClient.on('connect', () => {
      console.log('⚡ Conectado exitosamente a Redis Cloud');
    });

    redisClient.on('error', (err) => {
      console.warn('⚠️ Error de conexión a Redis:', err.message);
    });
  } catch (err) {
    isMock = true;
    redisClient = new InMemoryRedisMock();
  }
} else {
  isMock = true;
  redisClient = new InMemoryRedisMock();
}

/**
 * 1. Despacho Geoespacial: Actualizar posición GPS del chofer
 */
export async function updateDriverLocation(driverId, lng, lat) {
  return await redisClient.geoadd('drivers:geo', lng, lat, driverId);
}

/**
 * 2. Despacho Geoespacial: Buscar choferes en un radio estricto de 1 km
 */
export async function findNearbyDrivers(lng, lat, radiusKm = 1.0) {
  // GEORADIUS drivers:geo <lng> <lat> 1 km WITHDIST WITHCOORD
  const drivers = await redisClient.georadius(
    'drivers:geo',
    lng,
    lat,
    radiusKm,
    'km',
    'WITHDIST',
    'WITHCOORD'
  );
  return drivers.map(([driverId, distance, coords]) => ({
    driverId,
    distanceKm: parseFloat(distance),
    lng: parseFloat(coords[0]),
    lat: parseFloat(coords[1])
  }));
}

/**
 * 3. Subasta: Guardar oferta del chofer con TTL estricto de 10 segundos
 */
export async function setOfferWithTTL(tripId, driverId, proposedFare, ttlSeconds = 10) {
  const offerKey = `offer:${tripId}:${driverId}`;
  return await redisClient.set(offerKey, JSON.stringify({ proposedFare, driverId, tripId }), 'EX', ttlSeconds);
}

/**
 * 4. Subasta Atómica: "El primero que pulsa gana" (Script Lua)
 */
const ATOMIC_ACCEPT_LUA = `
local tripLockKey = KEYS[1]
local driverLockKey = KEYS[2]
local driverId = ARGV[1]
local tripId = ARGV[2]

local tripState = redis.call('GET', tripLockKey)
if tripState and tripState ~= "AVAILABLE" then
    return {0, "TRIP_ALREADY_TAKEN"}
end

redis.call('SET', tripLockKey, "ASSIGNED", "EX", 7200)
redis.call('SET', driverLockKey, tripId, "EX", 7200)
return {1, "SUCCESS"}
`;

export async function atomicAcceptTrip(tripId, driverId) {
  const tripLockKey = `trip:lock:${tripId}`;
  const driverLockKey = `driver:active_trip:${driverId}`;

  const result = await redisClient.eval(
    ATOMIC_ACCEPT_LUA,
    2,
    tripLockKey,
    driverLockKey,
    driverId,
    tripId
  );

  return {
    success: result[0] === 1,
    reason: result[1]
  };
}

/**
 * 5. Inicializar el bloqueo del viaje como disponible
 */
export async function initTripLock(tripId) {
  return await redisClient.set(`trip:lock:${tripId}`, 'AVAILABLE', 'EX', 1800);
}

/**
 * 6. Liberar al conductor al finalizar o cancelar el viaje
 */
export async function releaseDriverLock(driverId, tripId) {
  await redisClient.del(`driver:active_trip:${driverId}`);
  await redisClient.del(`trip:lock:${tripId}`);
}

export default redisClient;
