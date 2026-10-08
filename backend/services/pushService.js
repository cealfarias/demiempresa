import webpush from 'web-push';
import { pool } from '../db.js';

// Claves oficiales VAPID para Rumbo (demiempresa.online)
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BC7VqS4ZheyCMakrhtuQEtWmwLqJuEwO74CGJneq-uPK_y2wPuBuV-X7zzyvZ_HNliwcUK0TKRlhZGKdybHGpT8';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '_xyzKeYTdS8JZkpXjMMOmwoteTPRCBGe4ZbKiAqM9ok';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@demiempresa.online';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (err) {
  console.warn('⚠️ Error configurando VAPID en web-push:', err.message);
}

export class PushService {
  /**
   * Asegura la creación de la tabla de suscripciones push en PostgreSQL
   */
  static async initPushTable() {
    if (!pool) return;
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS viajes_push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(150),
          user_type VARCHAR(30) DEFAULT 'PASSENGER',
          endpoint TEXT NOT NULL UNIQUE,
          p256dh TEXT NOT NULL,
          auth TEXT NOT NULL,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_push_sub_user_id ON viajes_push_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_push_sub_user_type ON viajes_push_subscriptions(user_type);
      `);
      console.log('🔔 [PUSH] Tabla de suscripciones Push (viajes_push_subscriptions) lista y verificada');
    } catch (err) {
      console.warn('⚠️ [PUSH] Error verificando tabla de suscripciones:', err.message);
    }
  }

  /**
   * Guarda o actualiza una suscripción de notificaciones para un usuario o conductor
   */
  static async saveSubscription({ userId, userType = 'PASSENGER', subscription, userAgent = '' }) {
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      throw new Error('Suscripción push inválida: faltan endpoint o claves');
    }
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!p256dh || !auth) {
      throw new Error('Suscripción push inválida: falta p256dh o auth');
    }

    const query = `
      INSERT INTO viajes_push_subscriptions (user_id, user_type, endpoint, p256dh, auth, user_agent, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      ON CONFLICT (endpoint) DO UPDATE 
      SET user_id = EXCLUDED.user_id,
          user_type = EXCLUDED.user_type,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent,
          updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const res = await pool.query(query, [userId || null, userType, endpoint, p256dh, auth, userAgent]);
    return res.rows[0];
  }

  /**
   * Elimina una suscripción inválida o expirada (HTTP 404 o 410 Gone)
   */
  static async removeSubscription(endpoint) {
    if (!endpoint) return;
    try {
      await pool.query('DELETE FROM viajes_push_subscriptions WHERE endpoint = $1', [endpoint]);
      console.log(`🧹 [PUSH] Suscripción caducada eliminada: ${endpoint.substring(0, 45)}...`);
    } catch (err) {
      console.warn('⚠️ [PUSH] Error eliminando suscripción:', err.message);
    }
  }

  /**
   * Envía una notificación Web Push a una suscripción específica
   */
  static async sendPushToSubscription(subRow, payload) {
    const pushSubscription = {
      endpoint: subRow.endpoint,
      keys: {
        p256dh: subRow.p256dh,
        auth: subRow.auth
      }
    };

    const pushPayload = JSON.stringify({
      title: payload.title || 'Rumbo a mi Destino',
      body: payload.body || 'Tienes una actualización de tu viaje en Rumbo.',
      icon: payload.icon || '/rumbo-logo.png',
      badge: payload.badge || '/favicon.svg',
      tag: payload.tag || 'rumbo-notification',
      data: {
        url: payload.url || (subRow.user_type === 'DRIVER' ? '/conductor' : '/viajes'),
        ...(payload.data || {})
      },
      vibrate: payload.vibrate || [200, 100, 200, 100, 250]
    });

    try {
      await webpush.sendNotification(pushSubscription, pushPayload, {
        TTL: 60 * 60, // 1 hora de TTL en red
        urgency: payload.urgency || 'high'
      });
      return { success: true };
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // La suscripción expiró o el usuario revocó el permiso en el navegador
        await this.removeSubscription(subRow.endpoint);
      } else {
        console.warn(`⚠️ [PUSH] Error enviando a ${subRow.endpoint.substring(0, 40)}:`, err.message);
      }
      return { success: false, error: err.message };
    }
  }

  /**
   * Notifica a un usuario por su userId (pasajero o conductor)
   */
  static async sendNotificationToUser(userId, payload) {
    if (!userId) return 0;
    try {
      const res = await pool.query(
        'SELECT * FROM viajes_push_subscriptions WHERE user_id = $1::text OR user_id = $1',
        [String(userId)]
      );
      if (res.rows.length === 0) return 0;

      let sentCount = 0;
      for (const sub of res.rows) {
        const result = await this.sendPushToSubscription(sub, payload);
        if (result.success) sentCount++;
      }
      return sentCount;
    } catch (err) {
      console.warn(`⚠️ [PUSH] Error notificando a usuario ${userId}:`, err.message);
      return 0;
    }
  }

  /**
   * Notifica a todos los conductores activos con suscripción push (ej. nuevo viaje disponible o colectivo listo)
   */
  static async sendNotificationToDrivers(payload, excludeDriverId = null) {
    try {
      let query = "SELECT * FROM viajes_push_subscriptions WHERE user_type = 'DRIVER'";
      const params = [];
      if (excludeDriverId) {
        query += " AND (user_id IS NULL OR user_id <> $1)";
        params.push(String(excludeDriverId));
      }
      const res = await pool.query(query, params);
      if (res.rows.length === 0) return 0;

      let sentCount = 0;
      for (const sub of res.rows) {
        const result = await this.sendPushToSubscription(sub, payload);
        if (result.success) sentCount++;
      }
      return sentCount;
    } catch (err) {
      console.warn('⚠️ [PUSH] Error notificando a conductores:', err.message);
      return 0;
    }
  }

  /**
   * Notifica a los pasajeros miembros de un Colectivo Compartido
   */
  static async sendNotificationToPoolPassengers(passengerIds, payload) {
    if (!passengerIds || !Array.isArray(passengerIds) || passengerIds.length === 0) return 0;
    try {
      const res = await pool.query(
        'SELECT * FROM viajes_push_subscriptions WHERE user_id = ANY($1::text[])',
        [passengerIds.map(id => String(id))]
      );
      if (res.rows.length === 0) return 0;

      let sentCount = 0;
      for (const sub of res.rows) {
        const result = await this.sendPushToSubscription(sub, payload);
        if (result.success) sentCount++;
      }
      return sentCount;
    } catch (err) {
      console.warn('⚠️ [PUSH] Error notificando a pasajeros del colectivo:', err.message);
      return 0;
    }
  }
}
