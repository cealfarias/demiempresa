-- =====================================================================
-- RUMBO A MI DESTINO: MIGRACIÓN 002 - POLÍTICA DE BONOS 7+7 DÍAS
-- Máquina de estados: PENDING_ACTIVATION -> ACTIVE -> SPENT / EXPIRED
-- Regla de activación: Viaje completado >= $4.00 USD en menos de 7 días
-- =====================================================================

-- 1. Agregar columnas de control de estado y temporizadores duales
DO $$ BEGIN
    ALTER TABLE viajes_ledger_transactions 
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_ledger_transactions 
    ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMP WITH TIME ZONE NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_ledger_transactions 
    ADD COLUMN IF NOT EXISTS spend_expires_at TIMESTAMP WITH TIME ZONE NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_ledger_transactions 
    ADD COLUMN IF NOT EXISTS referrer_user_id VARCHAR(64) NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_ledger_transactions 
    ADD COLUMN IF NOT EXISTS referred_user_id VARCHAR(64) NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_ledger_transactions 
    ADD COLUMN IF NOT EXISTS qualifying_trip_id VARCHAR(64) NULL;
EXCEPTION WHEN others THEN null; END $$;

-- 2. Migrar registros existentes para retrocompatibilidad
UPDATE viajes_ledger_transactions
SET spend_expires_at = expires_at
WHERE spend_expires_at IS NULL AND expires_at IS NOT NULL;

UPDATE viajes_ledger_transactions
SET status = 'SPENT'
WHERE is_spent = TRUE;

-- 3. Índices estratégicos para cálculo de balance y barrido de expiración
CREATE INDEX IF NOT EXISTS idx_ledger_active_balance 
    ON viajes_ledger_transactions (to_address, status, is_spent, spend_expires_at);

CREATE INDEX IF NOT EXISTS idx_ledger_pending_referral 
    ON viajes_ledger_transactions (referred_user_id, status, activation_expires_at);

CREATE INDEX IF NOT EXISTS idx_ledger_referrer 
    ON viajes_ledger_transactions (referrer_user_id, status);
