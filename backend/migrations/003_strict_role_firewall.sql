-- =====================================================================
-- RUMBO A MI DESTINO: MIGRACIÓN 003 - CORTAFUEGOS ESTRICTO DE ROLES
-- Separación total: PASSENGER (Viral & Referidos) vs DRIVER (Operativo & Cuota)
-- Blindaje Anti-Arbitraje, Unicidad de Identidad y Cancelación de Bonos
-- =====================================================================

-- 1. ASEGURAR RESTRICCIONES DE UNICIDAD EN VIAJES_USERS
DO $$ BEGIN
    ALTER TABLE viajes_users 
    ALTER COLUMN dui SET NOT NULL;
EXCEPTION WHEN others THEN null; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_viajes_users_dui_unique 
    ON viajes_users (dui);

-- 2. ASEGURAR RESTRICCIONES DE UNICIDAD EN VIAJES_DRIVER_PROFILES (Licencia y Placas)
DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS license_number VARCHAR(30) NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS approved_by VARCHAR(64) NULL;
EXCEPTION WHEN others THEN null; END $$;

-- Restricción UNIQUE estricta en Placas de Vehículo (Un auto no puede registrarse en dos cuentas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_viajes_driver_vehicle_plate_unique 
    ON viajes_driver_profiles (vehicle_plate);

-- Restricción UNIQUE en Número de Licencia de Conducir
CREATE UNIQUE INDEX IF NOT EXISTS idx_viajes_driver_license_unique 
    ON viajes_driver_profiles (license_number) WHERE license_number IS NOT NULL;

-- 3. PERMITIR referral_code NULL EN WALLET_IDENTITIES (Los Choferes NO tienen código de referido)
ALTER TABLE viajes_wallet_identities 
    ALTER COLUMN referral_code DROP NOT NULL;

-- Limpieza preventiva: Si algún conductor tenía código de referido, se anula de inmediato
UPDATE viajes_wallet_identities w
SET referral_code = NULL
FROM viajes_users u
WHERE w.user_id = u.id::text AND u.role = 'DRIVER';

-- 4. AMPLIAR EL CHECK CONSTRAINT DE TIPOS DE TRANSACCIÓN EN EL LIBRO MAYOR
ALTER TABLE viajes_ledger_transactions 
    DROP CONSTRAINT IF EXISTS viajes_ledger_transactions_transaction_type_check;

ALTER TABLE viajes_ledger_transactions 
    ADD CONSTRAINT viajes_ledger_transactions_transaction_type_check CHECK (
        transaction_type IN (
            'WELCOME_BONUS',                -- Bono de bienvenida ($1.00 USD, solo pasajeros)
            'REFERRAL_BONUS',               -- Bono de referido ($1.00 USD, solo pasajeros anfitriones)
            'TRIP_PAYMENT',                 -- Pago de carrera recibido por chofer
            'WEEKLY_FEE_PAYMENT',           -- Conductor liquida cuota de $10 con sus bonos de carrera
            'DRIVER_FEE_WAIVER',            -- Conductor canjea 1 bono por 1 día de plataforma gratis
            'CHANGE_OUTPUT',                -- Remanente / vuelto en ledger
            'EXPIRED_SWEEP',                -- Quema por vencimiento
            'ROLE_TRANSITION_CANCELLATION'  -- Quema de bonos promocionales si un pasajero pasa a chofer
        )
    );

-- 5. RESTRICCIÓN DE INTEGRIDAD: Solo pasajeros pueden ser anfitriones de referidos
CREATE OR REPLACE FUNCTION fn_check_passenger_referral_integrity()
RETURNS TRIGGER AS $$
DECLARE
    referrer_role VARCHAR(20);
    referred_role VARCHAR(20);
BEGIN
    SELECT role::text INTO referrer_role FROM viajes_users WHERE id = NEW.referrer_user_id;
    SELECT role::text INTO referred_role FROM viajes_users WHERE id = NEW.referred_user_id;

    IF referrer_role <> 'PASSENGER' THEN
        RAISE EXCEPTION 'Cortafuegos de Roles: Solo los usuarios con rol PASSENGER pueden referir. Los conductores no participan en el programa de referidos.';
    END IF;

    IF referred_role <> 'PASSENGER' THEN
        RAISE EXCEPTION 'Cortafuegos de Roles: Solo los usuarios con rol PASSENGER pueden ser referidos con bonos.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_passenger_referral_integrity ON viajes_referrals;

CREATE TRIGGER trg_check_passenger_referral_integrity
    BEFORE INSERT OR UPDATE ON viajes_referrals
    FOR EACH ROW
    EXECUTE FUNCTION fn_check_passenger_referral_integrity();
