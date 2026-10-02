import { pool } from '../db.js';
import { LedgerService } from './ledgerService.js';

export class ReferralService {
  /**
   * Registra un referido y activa la Fase 1 (TTL 7 Días para activación con viaje >= $4.00)
   */
  static async createReferral({ referrerUserId, referredUserId, referralType = 'PASSENGER_TO_PASSENGER' }) {
    const query = `
      INSERT INTO viajes_referrals (referrer_user_id, referred_user_id, referral_type, status, registered_at, activation_deadline)
      VALUES ($1, $2, $3, 'PENDING_ACTIVATION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days')
      RETURNING *;
    `;
    const res = await pool.query(query, [referrerUserId, referredUserId, referralType]);

    // Registrar también en el Libro Mayor Criptográfico Inmutable en estado PENDING_ACTIVATION
    try {
      await LedgerService.registerReferralPending(referrerUserId, referredUserId);
    } catch (e) {
      console.warn('⚠️ No se pudo registrar referido en LedgerService:', e.message);
    }

    return res.rows[0];
  }

  /**
   * Valida si un viaje califica para activar el premio de referido (>= $4.00 USD)
   * y desencadena la Fase 2 (TTL 7 Días para gastar el crédito en el Ledger)
   */
  static async processTripCompletionForReferral(tripId, passengerUserId, agreedFare) {
    if (parseFloat(agreedFare) < 4.00) {
      return null;
    }

    // Activar en el Libro Mayor Criptográfico Inmutable
    try {
      await LedgerService.processTripCompletionForReferral(tripId, passengerUserId, agreedFare);
    } catch (e) {
      console.warn('⚠️ Error al activar bono en LedgerService:', e.message);
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

      // Barrido en el Libro Mayor Criptográfico Inmutable (Ledger UTXO)
      const ledgerSweep = await LedgerService.expireOutdatedBonuses().catch(() => ({ expiredPendingCount: 0, expiredActiveCount: 0 }));

      await client.query('COMMIT');
      return {
        expiredReferrals: expiredRefs.rowCount + (ledgerSweep.expiredPendingCount || 0),
        expiredCredits: expiredCredits.rowCount + (ledgerSweep.expiredActiveCount || 0)
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
