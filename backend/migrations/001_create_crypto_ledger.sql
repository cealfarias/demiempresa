-- =====================================================================
-- RUMBO A MI DESTINO: LIBRO MAYOR CRIPTOGRÁFICO INMUTABLE (LEDGER UTXO)
-- Tablas con prefijo viajes_ para coexistencia segura en PostgreSQL
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. IDENTIDADES DE WALLET CRIPTOGRÁFICA (Ed25519 & AES-256-GCM)
CREATE TABLE IF NOT EXISTS viajes_wallet_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) UNIQUE NOT NULL,      -- ID del usuario (UUID o String)
    public_key TEXT NOT NULL,                 -- Clave pública Ed25519 (PEM / SPKI)
    encrypted_private_key TEXT NOT NULL,      -- Clave privada encriptada AES-256-GCM (iv:authTag:data)
    address VARCHAR(64) UNIQUE NOT NULL,      -- Dirección criptográfica derivada (rmb_ + SHA-256)
    referral_code VARCHAR(16) UNIQUE NOT NULL,-- Código único de referidos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_viajes_wallet_user_id ON viajes_wallet_identities(user_id);
CREATE INDEX IF NOT EXISTS idx_viajes_wallet_address ON viajes_wallet_identities(address);
CREATE INDEX IF NOT EXISTS idx_viajes_wallet_referral ON viajes_wallet_identities(referral_code);

-- 2. LIBRO MAYOR ENCADENADO (LEDGER TRANSACTIONS UTXO)
CREATE TABLE IF NOT EXISTS viajes_ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number BIGSERIAL UNIQUE NOT NULL,
    previous_hash VARCHAR(64) NOT NULL,
    from_address VARCHAR(64) NOT NULL,        -- 'SYSTEM_MINT' o dirección emisora
    to_address VARCHAR(64) NOT NULL,          -- Dirección receptora
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    input_ref UUID NULL REFERENCES viajes_ledger_transactions(id), -- UTXO consumido
    is_spent BOOLEAN DEFAULT FALSE NOT NULL,
    spent_at TIMESTAMP WITH TIME ZONE NULL,
    spending_tx_id UUID NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- Caducidad estricta (ej. 7 días para bonos)
    transaction_type VARCHAR(32) NOT NULL CHECK (
        transaction_type IN (
            'WELCOME_BONUS',         -- Bono bienvenida $1.00 pasajero
            'REFERRAL_BONUS',        -- Bono referido $1.00 anfitrión
            'TRIP_PAYMENT',          -- Pago de carrera (Pasajero -> Conductor)
            'WEEKLY_FEE_PAYMENT',    -- Conductor paga su cuota semanal de $10 con bonos
            'DRIVER_FEE_WAIVER',     -- Conductor canjea bono por 1 día de plataforma gratis
            'CHANGE_OUTPUT',         -- Salida de vuelto / remanente
            'EXPIRED_SWEEP'          -- Quema por caducidad
        )
    ),
    reference_id VARCHAR(64) NULL,            -- trip_id, dui, o target_id
    signature TEXT NOT NULL,                  -- Firma digital Ed25519 en Base64
    current_hash VARCHAR(64) NOT NULL,        -- Hash SHA-256 del bloque encadenado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices de alto rendimiento para UTXO no gastados y consultas de balance
CREATE INDEX IF NOT EXISTS idx_viajes_ledger_to_unspent 
    ON viajes_ledger_transactions(to_address, is_spent, expires_at);
CREATE INDEX IF NOT EXISTS idx_viajes_ledger_from_address 
    ON viajes_ledger_transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_viajes_ledger_sequence 
    ON viajes_ledger_transactions(sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_viajes_ledger_input_ref 
    ON viajes_ledger_transactions(input_ref);

-- Vistas de conveniencia sin prefijo para compatibilidad con código estándar
CREATE OR REPLACE VIEW wallet_identities AS SELECT * FROM viajes_wallet_identities;
CREATE OR REPLACE VIEW ledger_transactions AS SELECT * FROM viajes_ledger_transactions;
