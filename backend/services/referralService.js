import { pool } from '../db.js';

export class ReferralService {
  /**
   * Registra un referido y activa la Fase 1 (TTL 7 Días para activación)
   */
  static async createReferral({ referrerUserId, referredUserId, referralType = 'PASSENGER_TO_PASSENGER' }) {
    const query = `
      INSERT INTO viajes_referrals (referrer_user_id, referred_user_id, referral_type, status, registered_at, activation_deadline)
      VALUES ($1, $2, $3, 'PENDING_ACTIVATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days')
      RETURNING *;
    `;
    const res = await pool.query(query, [referrerUserId, referredUserId, referralType]);
    return res.rows[0];
  }

  /**
   * Valida si un viaje califica para activar el premio de referido (>= $3.00)
   * y desencadena la Fase 2 (TTL 7 Días para gastar el crédito)
   */
  static async processTripCompletionForReferral(tripId, passengerUserId, agreedFare) {
    if (parseFloat(agreedFare) < 3.00) {
      return null;
    }

    const refQuery = `
      SELECT * FROM viajes_referrals
      WHERE referred_user_id = $1
        AND status = 'PENDING_ACTIVATION'
        AND activation_deadline > CURRENT_TIMESTAMP
      LIMIT 1;
    `;
    const refRes = await pool.query(refQuery, [passengerUserId]);
    if (refRes.rows.length === 0) {
      return null;
    }

    const referral = refRes.rows[0];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Marcar referencia como ACTIVADA
      await client.query(`
        UPDATE viajes_referrals
        SET status = 'ACTIVATED',
            activated_at = CURRENT_TIMESTAMP,
            qualifying_trip_id = $1
        WHERE id = $2
      `, [tripId, referral.id]);

      // 2. Conceder $1.00 USD de crédito al referente con TTL de 7 días exactos (Fase 2)
      const creditRes = await client.query(`
        INSERT INTO viajes_user_credits (
          user_id,
          referral_id,
          amount,
          status,
          granted_at,
          credit_expires_at
        )
        VALUES ($1, $2, 1.00, 'AVAILABLE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days')
        RETURNING *;
      `, [referral.referrer_user_id, referral.id]);

      await client.query('COMMIT');
      return creditRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al procesar recompensa de referido:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Consulta si el pasajero tiene créditos de $1.00 vigentes para aplicar en su viaje
   */
  static async getAvailableCredit(userId) {
    const query = `
      SELECT * FROM viajes_user_credits
      WHERE user_id = $1
        AND status = 'AVAILABLE'
        AND credit_expires_at > CURRENT_TIMESTAMP
      ORDER BY credit_expires_at ASC
      LIMIT 1;
    `;
    const res = await pool.query(query, [userId]);
    return res.rows[0] || null;
  }

  /**
   * Redime el crédito de $1.00 en el viaje y lo imputa a la cuota del chofer
   */
  static async redeemCredit(creditId, tripId, driverProfileId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Marcar crédito como redimido
      await client.query(`
        UPDATE viajes_user_credits
        SET status = 'REDEEMED',
            redeemed_at = CURRENT_TIMESTAMP,
            redeemed_trip_id = $1
        WHERE id = $2;
      `, [tripId, creditId]);

      // 2. Incrementar el conteo de bonos semanales del chofer (Cap de 10)
      const driverRes = await client.query(`
        UPDATE viajes_driver_profiles
        SET current_week_bonuses_count = LEAST(10, current_week_bonuses_count + 1)
        WHERE id = $1
        RETURNING current_week_bonuses_count;
      `, [driverProfileId]);

      const bonusesCount = driverRes.rows[0]?.current_week_bonuses_count || 1;
      const netFee = Math.max(0.00, 10.00 - bonusesCount * 1.00);

      // 3. Actualizar registro de liquidación semanal del conductor
      await client.query(`
        INSERT INTO viajes_driver_subscriptions (
          driver_id,
          week_start_date,
          week_end_date,
          base_fee,
          bonuses_count,
          net_fee_paid,
          status
        )
        VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 10.00, $2, $3, 'PAID')
        ON CONFLICT (driver_id, week_start_date)
        DO UPDATE SET
          bonuses_count = EXCLUDED.bonuses_count,
          net_fee_paid = EXCLUDED.net_fee_paid;
      `, [driverProfileId, bonusesCount, netFee]);

      await client.query('COMMIT');
      return { success: true, bonusesCount, netFee };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error al redimir crédito:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Valida si el chofer puede recibir viajes con bono (Cap máximo 10 por semana)
   */
  static async canDriverAcceptBonusTrip(driverProfileId) {
    const res = await pool.query(
      'SELECT current_week_bonuses_count FROM viajes_driver_profiles WHERE id = $1',
      [driverProfileId]
    );
    if (res.rows.length === 0) return false;
    return res.rows[0].current_week_bonuses_count < 10;
  }

  /**
   * Tarea Cron de Expiración TTL (Fase 1 y Fase 2)
   */
  static async runTTLExpirationSweep() {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const expiredRefs = await client.query(`
        UPDATE viajes_referrals
        SET status = 'ACTIVATION_EXPIRED'
        WHERE status = 'PENDING_ACTIVATION'
          AND CURRENT_TIMESTAMP > activation_deadline
        RETURNING id;
      `);

      const expiredCredits = await client.query(`
        UPDATE viajes_user_credits
        SET status = 'CREDIT_EXPIRED'
        WHERE status = 'AVAILABLE'
          AND CURRENT_TIMESTAMP > credit_expires_at
        RETURNING id;
      `);

      await client.query('COMMIT');
      return {
        expiredReferrals: expiredRefs.rowCount,
        expiredCredits: expiredCredits.rowCount
      };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error en barrido TTL:', err);
      return { expiredReferrals: 0, expiredCredits: 0 };
    } finally {
      client.release();
    }
  }
}
