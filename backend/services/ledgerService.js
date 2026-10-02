// =====================================================================
// RUMBO A MI DESTINO: SERVICIO DE LIBRO MAYOR CRIPTOGRÁFICO INMUTABLE
// Arquitectura UTXO, Firmas Asimétricas Ed25519 y Hashes SHA-256 Encadenados
// =====================================================================

import crypto from 'crypto';
import { pool } from '../db.js';

const SYSTEM_MINT_ADDRESS = 'SYSTEM_MINT_RUMBO_RESERVE_V1';
const SYSTEM_BURN_VAULT = 'SYSTEM_BURN_VAULT_RUMBO';
const GENESIS_PREV_HASH = '0'.repeat(64);
const ADVISORY_LOCK_ID = 7331; // Lock transaccional exclusivo para serializar la cadena

// Llave maestra para encriptación de claves privadas en reposo (AES-256-GCM)
const MASTER_ENCRYPTION_KEY = process.env.WALLET_MASTER_KEY || 
  crypto.createHash('sha256').update('demiempresa-rumbo-wallet-master-secret-seed-2026').digest('hex');

// =====================================================================
// UTILIDADES CRIPTOGRÁFICAS NATIVAS DE NODE.JS
// =====================================================================

export function encryptPrivateKey(privateKeyPem) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(MASTER_ENCRYPTION_KEY.slice(0, 64), 'hex'), iv);
  let encrypted = cipher.update(privateKeyPem, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptPrivateKey(encryptedPayload) {
  const [ivHex, tagHex, dataHex] = encryptedPayload.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(MASTER_ENCRYPTION_KEY.slice(0, 64), 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(dataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function signPayload(privateKeyPem, payloadString) {
  return crypto.sign(null, Buffer.from(payloadString), privateKeyPem).toString('base64');
}

export function verifySignature(publicKeyPem, payloadString, signatureBase64) {
  try {
    return crypto.verify(
      null,
      Buffer.from(payloadString),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
  } catch {
    return false;
  }
}

export function calculateBlockHash(data) {
  const content = [
    data.previous_hash,
    data.sequence_number,
    data.from_address,
    data.to_address,
    parseFloat(data.amount).toFixed(2),
    data.input_ref || 'NONE',
    data.transaction_type,
    data.expires_at || 'NONE',
    data.signature
  ].join('|');
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Par de claves de la autoridad de emisión del sistema
let systemKeyPair = null;
function getSystemAuthorityKeys() {
  if (!systemKeyPair) {
    if (process.env.SYSTEM_MINT_PRIVATE_KEY && process.env.SYSTEM_MINT_PUBLIC_KEY) {
      systemKeyPair = {
        privateKey: process.env.SYSTEM_MINT_PRIVATE_KEY,
        publicKey: process.env.SYSTEM_MINT_PUBLIC_KEY
      };
    } else {
      systemKeyPair = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
    }
  }
  return systemKeyPair;
}

// =====================================================================
// SERVICIO PRINCIPAL: LEDGER SERVICE
// =====================================================================

export const LedgerService = {
  /**
   * 1. Crear o recuperar la Identidad de Wallet Criptográfica del Usuario
   */
  async getOrCreateWalletIdentity(userId, clientDb = null) {
    const db = clientDb || pool;
    const existing = await db.query(
      'SELECT id, user_id, public_key, address, referral_code, created_at FROM viajes_wallet_identities WHERE user_id = $1',
      [userId.toString()]
    );

    if (existing.rowCount > 0) {
      return existing.rows[0];
    }

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const address = 'rmb_' + crypto.createHash('sha256').update(publicKey).digest('hex').slice(0, 40);
    const referralCode = 'RMB' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const encryptedKey = encryptPrivateKey(privateKey);

    const res = await db.query(`
      INSERT INTO viajes_wallet_identities (user_id, public_key, encrypted_private_key, address, referral_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, public_key, address, referral_code, created_at;
    `, [userId.toString(), publicKey, encryptedKey, address, referralCode]);

    return res.rows[0];
  },

  /**
   * 2. Acreditar Bono de Bienvenida ($1.00 USD) al Pasajero - Válido por 7 Días
   */
  async grantWelcomeBonus(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID]);

      const wallet = await this.getOrCreateWalletIdentity(userId, client);

      // Prevenir doble bienvenida
      const existing = await client.query(
        "SELECT id FROM viajes_ledger_transactions WHERE to_address = $1 AND transaction_type = 'WELCOME_BONUS'",
        [wallet.address]
      );
      if (existing.rowCount > 0) {
        await client.query('COMMIT');
        return { success: false, message: 'El bono de bienvenida ya fue emitido previamente.', wallet };
      }

      // Obtener último bloque de la cadena
      const lastBlockRes = await client.query(
        'SELECT current_hash, sequence_number FROM viajes_ledger_transactions ORDER BY sequence_number DESC LIMIT 1'
      );
      const lastBlock = lastBlockRes.rows[0];

      const prevHash = lastBlock ? lastBlock.current_hash : GENESIS_PREV_HASH;
      const nextSeq = lastBlock ? parseInt(lastBlock.sequence_number, 10) + 1 : 1;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const amount = '1.00';
      const txType = 'WELCOME_BONUS';

      const payload = `${prevHash}|${nextSeq}|${SYSTEM_MINT_ADDRESS}|${wallet.address}|${amount}|NONE|${txType}|${expiresAt}`;
      const { privateKey } = getSystemAuthorityKeys();
      const signature = signPayload(privateKey, payload);

      const currentHash = calculateBlockHash({
        previous_hash: prevHash,
        sequence_number: nextSeq,
        from_address: SYSTEM_MINT_ADDRESS,
        to_address: wallet.address,
        amount,
        input_ref: null,
        transaction_type: txType,
        expires_at: expiresAt,
        signature
      });

      const insertRes = await client.query(`
        INSERT INTO viajes_ledger_transactions (
          sequence_number, previous_hash, from_address, to_address, amount,
          input_ref, is_spent, expires_at, transaction_type, reference_id,
          signature, current_hash
        ) VALUES ($1, $2, $3, $4, $5, NULL, FALSE, $6, $7, $8, $9, $10)
        RETURNING *;
      `, [
        nextSeq, prevHash, SYSTEM_MINT_ADDRESS, wallet.address, amount,
        expiresAt, txType, userId.toString(), signature, currentHash
      ]);

      await client.query('COMMIT');
      return { success: true, transaction: insertRes.rows[0], wallet };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * 3. Acreditar Bono por Referido ($1.00 USD) al Anfitrión - Válido por 7 Días
   */
  async grantReferralBonus(hostUserId, referredUserId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID]);

      const hostWallet = await this.getOrCreateWalletIdentity(hostUserId, client);

      const lastBlockRes = await client.query(
        'SELECT current_hash, sequence_number FROM viajes_ledger_transactions ORDER BY sequence_number DESC LIMIT 1'
      );
      const lastBlock = lastBlockRes.rows[0];

      const prevHash = lastBlock ? lastBlock.current_hash : GENESIS_PREV_HASH;
      const nextSeq = lastBlock ? parseInt(lastBlock.sequence_number, 10) + 1 : 1;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const amount = '1.00';
      const txType = 'REFERRAL_BONUS';

      const payload = `${prevHash}|${nextSeq}|${SYSTEM_MINT_ADDRESS}|${hostWallet.address}|${amount}|NONE|${txType}|${expiresAt}`;
      const { privateKey } = getSystemAuthorityKeys();
      const signature = signPayload(privateKey, payload);

      const currentHash = calculateBlockHash({
        previous_hash: prevHash,
        sequence_number: nextSeq,
        from_address: SYSTEM_MINT_ADDRESS,
        to_address: hostWallet.address,
        amount,
        input_ref: null,
        transaction_type: txType,
        expires_at: expiresAt,
        signature
      });

      const insertRes = await client.query(`
        INSERT INTO viajes_ledger_transactions (
          sequence_number, previous_hash, from_address, to_address, amount,
          input_ref, is_spent, expires_at, transaction_type, reference_id,
          signature, current_hash
        ) VALUES ($1, $2, $3, $4, $5, NULL, FALSE, $6, $7, $8, $9, $10)
        RETURNING *;
      `, [
        nextSeq, prevHash, SYSTEM_MINT_ADDRESS, hostWallet.address, amount,
        expiresAt, txType, referredUserId.toString(), signature, currentHash
      ]);

      await client.query('COMMIT');
      return { success: true, transaction: insertRes.rows[0], wallet: hostWallet };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * 4. Transferir Bono para Pago de Carrera (Pasajero -> Conductor)
   * Anti-Doble Gasto estricto con SELECT ... FOR UPDATE
   */
  async transferTripPayment(passengerUserId, driverUserId, tripId, amountToPay = 1.00) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID]);

      const passWalletRow = (await client.query('SELECT * FROM viajes_wallet_identities WHERE user_id = $1', [passengerUserId.toString()])).rows[0];
      const driverWallet = await this.getOrCreateWalletIdentity(driverUserId, client);

      if (!passWalletRow) {
        throw new Error('El pasajero no tiene una wallet activa.');
      }

      // Buscar UTXO activo, no gastado y vigente
      const utxoRes = await client.query(`
        SELECT * FROM viajes_ledger_transactions
        WHERE to_address = $1 AND is_spent = FALSE AND expires_at > NOW()
        ORDER BY expires_at ASC
        LIMIT 1
        FOR UPDATE;
      `, [passWalletRow.address]);

      if (utxoRes.rowCount === 0) {
        throw new Error('No tienes bonos disponibles o han expirado.');
      }

      const inputUtxo = utxoRes.rows[0];

      const lastBlock = (await client.query(
        'SELECT current_hash, sequence_number FROM viajes_ledger_transactions ORDER BY sequence_number DESC LIMIT 1'
      )).rows[0];

      const prevHash = lastBlock.current_hash;
      const nextSeq = parseInt(lastBlock.sequence_number, 10) + 1;
      // Para el conductor, el bono tiene 30 días para aplicarlo a su cuota semanal
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const txType = 'TRIP_PAYMENT';

      const userPrivateKey = decryptPrivateKey(passWalletRow.encrypted_private_key);
      const payload = `${prevHash}|${nextSeq}|${passWalletRow.address}|${driverWallet.address}|${amountToPay.toFixed(2)}|${inputUtxo.id}|${txType}|${expiresAt}`;
      const signature = signPayload(userPrivateKey, payload);

      const currentHash = calculateBlockHash({
        previous_hash: prevHash,
        sequence_number: nextSeq,
        from_address: passWalletRow.address,
        to_address: driverWallet.address,
        amount: amountToPay,
        input_ref: inputUtxo.id,
        transaction_type: txType,
        expires_at: expiresAt,
        signature
      });

      const newTxRes = await client.query(`
        INSERT INTO viajes_ledger_transactions (
          sequence_number, previous_hash, from_address, to_address, amount,
          input_ref, is_spent, expires_at, transaction_type, reference_id,
          signature, current_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9, $10, $11)
        RETURNING *;
      `, [
        nextSeq, prevHash, passWalletRow.address, driverWallet.address, amountToPay,
        inputUtxo.id, expiresAt, txType, tripId, signature, currentHash
      ]);

      const createdTx = newTxRes.rows[0];

      // Marcar UTXO del pasajero como consumido
      await client.query(`
        UPDATE viajes_ledger_transactions
        SET is_spent = TRUE, spent_at = NOW(), spending_tx_id = $1
        WHERE id = $2;
      `, [createdTx.id, inputUtxo.id]);

      await client.query('COMMIT');
      return { success: true, transaction: createdTx };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * 5. Conductor Paga Cuota Semanal ($10.00 Base) Usando sus Bonos Acumulados
   * Permite pago parcial (descuento) o total ($0.00 en efectivo)
   */
  async payWeeklyFeeWithBonuses(driverUserId, requestedBonusesToUse = 10, totalWeeklyFee = 10.00) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID]);

      const driverWalletRow = (await client.query('SELECT * FROM viajes_wallet_identities WHERE user_id = $1', [driverUserId.toString()])).rows[0];
      if (!driverWalletRow) throw new Error('Wallet del conductor no encontrada.');

      const maxToFetch = Math.min(requestedBonusesToUse, totalWeeklyFee);
      const utxosRes = await client.query(`
        SELECT * FROM viajes_ledger_transactions
        WHERE to_address = $1 AND is_spent = FALSE
        ORDER BY created_at ASC
        LIMIT $2
        FOR UPDATE;
      `, [driverWalletRow.address, maxToFetch]);

      const utxosToBurn = utxosRes.rows;
      const bonusDeduction = utxosToBurn.length * 1.00;
      const remainingCashToPay = Math.max(0, totalWeeklyFee - bonusDeduction);

      if (utxosToBurn.length === 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: 'No tienes bonos disponibles para aplicar a tu cuota semanal.',
          bonusesApplied: 0,
          remainingCashToPay: totalWeeklyFee.toFixed(2)
        };
      }

      let lastBlock = (await client.query(
        'SELECT current_hash, sequence_number FROM viajes_ledger_transactions ORDER BY sequence_number DESC LIMIT 1'
      )).rows[0];

      const burnAddress = 'SYSTEM_BURN_WEEKLY_FEE';
      const txType = 'WEEKLY_FEE_PAYMENT';
      const userPrivateKey = decryptPrivateKey(driverWalletRow.encrypted_private_key);
      const processedTxs = [];

      for (const utxo of utxosToBurn) {
        const prevHash = lastBlock.current_hash;
        const nextSeq = parseInt(lastBlock.sequence_number, 10) + 1;
        const payload = `${prevHash}|${nextSeq}|${driverWalletRow.address}|${burnAddress}|1.00|${utxo.id}|${txType}|FEE_PAYMENT`;
        const signature = signPayload(userPrivateKey, payload);

        const currentHash = calculateBlockHash({
          previous_hash: prevHash,
          sequence_number: nextSeq,
          from_address: driverWalletRow.address,
          to_address: burnAddress,
          amount: '1.00',
          input_ref: utxo.id,
          transaction_type: txType,
          expires_at: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
          signature
        });

        const burnTx = (await client.query(`
          INSERT INTO viajes_ledger_transactions (
            sequence_number, previous_hash, from_address, to_address, amount,
            input_ref, is_spent, expires_at, transaction_type, reference_id,
            signature, current_hash
          ) VALUES ($1, $2, $3, $4, 1.00, $5, TRUE, NOW(), $6, $7, $8, $9)
          RETURNING *;
        `, [
          nextSeq, prevHash, driverWalletRow.address, burnAddress, utxo.id,
          txType, `FEE-${new Date().toISOString().slice(0, 10)}`, signature, currentHash
        ])).rows[0];

        await client.query(
          'UPDATE viajes_ledger_transactions SET is_spent = TRUE, spent_at = NOW(), spending_tx_id = $1 WHERE id = $2',
          [burnTx.id, utxo.id]
        );

        lastBlock = burnTx;
        processedTxs.push(burnTx);
      }

      // Si cubrió los $10.00 completos con bonos, activar 7 días de membresía completa
      if (remainingCashToPay === 0) {
        await client.query(`
          UPDATE viajes_driver_profiles
          SET subscription_status = 'PAID'
          WHERE user_id::text = $1 OR id::text = $1;
        `, [driverUserId.toString()]).catch(() => {});
      }

      await client.query('COMMIT');

      return {
        success: true,
        bonusesApplied: bonusDeduction,
        remainingCashToPay: remainingCashToPay.toFixed(2),
        isFullyPaid: remainingCashToPay === 0,
        transactions: processedTxs,
        message: remainingCashToPay === 0
          ? '¡Cuota semanal saldada al 100% con tu saldo bonificado! Tu semana está totalmente activa sin costo.'
          : `Se aplicaron $${bonusDeduction.toFixed(2)} de tus bonos. Saldo restante a pagar en efectivo: $${remainingCashToPay.toFixed(2)} USD.`
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * 6. Conductor Canjea 1 Bono por 1 Día Gratis en la Plataforma
   */
  async redeemDriverFreeDay(driverUserId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID]);

      const driverWalletRow = (await client.query('SELECT * FROM viajes_wallet_identities WHERE user_id = $1', [driverUserId.toString()])).rows[0];
      if (!driverWalletRow) throw new Error('Wallet del conductor no encontrada.');

      const utxoRes = await client.query(`
        SELECT * FROM viajes_ledger_transactions
        WHERE to_address = $1 AND is_spent = FALSE
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE;
      `, [driverWalletRow.address]);

      if (utxoRes.rowCount === 0) {
        throw new Error('No tienes bonos disponibles para canjear días gratis.');
      }

      const availableUtxo = utxoRes.rows[0];
      const lastBlock = (await client.query(
        'SELECT current_hash, sequence_number FROM viajes_ledger_transactions ORDER BY sequence_number DESC LIMIT 1'
      )).rows[0];

      const prevHash = lastBlock.current_hash;
      const nextSeq = parseInt(lastBlock.sequence_number, 10) + 1;
      const txType = 'DRIVER_FEE_WAIVER';
      const userPrivateKey = decryptPrivateKey(driverWalletRow.encrypted_private_key);
      const payload = `${prevHash}|${nextSeq}|${driverWalletRow.address}|${SYSTEM_BURN_VAULT}|1.00|${availableUtxo.id}|${txType}|DAY_WAIVER`;
      const signature = signPayload(userPrivateKey, payload);

      const currentHash = calculateBlockHash({
        previous_hash: prevHash,
        sequence_number: nextSeq,
        from_address: driverWalletRow.address,
        to_address: SYSTEM_BURN_VAULT,
        amount: '1.00',
        input_ref: availableUtxo.id,
        transaction_type: txType,
        expires_at: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
        signature
      });

      const burnTxRes = await client.query(`
        INSERT INTO viajes_ledger_transactions (
          sequence_number, previous_hash, from_address, to_address, amount,
          input_ref, is_spent, expires_at, transaction_type, reference_id,
          signature, current_hash
        ) VALUES ($1, $2, $3, $4, 1.00, $5, TRUE, NOW(), $6, $7, $8, $9)
        RETURNING *;
      `, [
        nextSeq, prevHash, driverWalletRow.address, SYSTEM_BURN_VAULT, availableUtxo.id,
        txType, driverUserId.toString(), signature, currentHash
      ]);

      await client.query(
        'UPDATE viajes_ledger_transactions SET is_spent = TRUE, spent_at = NOW(), spending_tx_id = $1 WHERE id = $2',
        [burnTxRes.rows[0].id, availableUtxo.id]
      );

      await client.query('COMMIT');
      return {
        success: true,
        message: '¡1 Día Gratis acreditado exitosamente a tu cuenta de conductor!',
        transaction: burnTxRes.rows[0]
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * 7. Resumen de Saldo y UTXOs Válidos del Usuario
   */
  async getWalletSummary(userId) {
    const wallet = await this.getOrCreateWalletIdentity(userId);

    const activeUtxos = (await pool.query(`
      SELECT id, amount, expires_at, created_at, transaction_type, current_hash
      FROM viajes_ledger_transactions
      WHERE to_address = $1 AND is_spent = FALSE AND expires_at > NOW()
      ORDER BY expires_at ASC
    `, [wallet.address])).rows;

    const totalBalance = activeUtxos.reduce((acc, row) => acc + parseFloat(row.amount), 0).toFixed(2);

    return {
      address: wallet.address,
      referralCode: wallet.referral_code,
      balance: totalBalance,
      activeBonusesCount: activeUtxos.length,
      bonuses: activeUtxos
    };
  },

  /**
   * 8. Historial de Transacciones de la Wallet
   */
  async getWalletHistory(userId) {
    const wallet = (await pool.query(
      'SELECT address FROM viajes_wallet_identities WHERE user_id = $1',
      [userId.toString()]
    )).rows[0];

    if (!wallet) return { transactions: [] };

    const txs = (await pool.query(`
      SELECT sequence_number, from_address, to_address, amount, is_spent, expires_at, transaction_type, current_hash, created_at
      FROM viajes_ledger_transactions
      WHERE to_address = $1 OR from_address = $1
      ORDER BY sequence_number DESC
      LIMIT 50
    `, [wallet.address])).rows;

    return { transactions: txs };
  },

  /**
   * 9. Auditoría Criptográfica de Integridad del Libro Mayor Completo
   */
  async verifyLedgerIntegrity() {
    const res = await pool.query('SELECT * FROM viajes_ledger_transactions ORDER BY sequence_number ASC');
    const chain = res.rows;

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];

      if (block.previous_hash !== expectedPrevHash) {
        return {
          valid: false,
          brokenSequence: block.sequence_number,
          reason: `Cadena rota en bloque #${block.sequence_number}. previous_hash no coincide.`
        };
      }

      const recalculatedHash = calculateBlockHash(block);
      if (block.current_hash !== recalculatedHash) {
        return {
          valid: false,
          brokenSequence: block.sequence_number,
          reason: `Alteración de datos detectada en bloque #${block.sequence_number}. Hash SHA-256 no coincide.`
        };
      }

      expectedPrevHash = block.current_hash;
    }

    return {
      valid: true,
      totalBlocksVerified: chain.length,
      lastBlockHash: expectedPrevHash,
      timestamp: new Date().toISOString()
    };
  }
};
