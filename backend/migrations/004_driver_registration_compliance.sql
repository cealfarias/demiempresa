-- =====================================================================
-- RUMBO A MI DESTINO: MIGRACIÓN 004 - REGISTRO Y CUMPLIMIENTO DE CONDUCTORES
-- Expediente digital, fotos de documentos legales, solvencias y estado de aprobación
-- =====================================================================

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS dui_front_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS dui_back_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS license_front_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS license_back_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS circulation_card_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS police_record_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS criminal_record_url TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS vehicle_photo_front TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS vehicle_photo_inside TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(150) NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(20) NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE viajes_driver_profiles 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
EXCEPTION WHEN others THEN null; END $$;

-- Asegurar que el CHECK CONSTRAINT de approval_status acepte 'IN_REVIEW'
ALTER TABLE viajes_driver_profiles 
    DROP CONSTRAINT IF EXISTS viajes_driver_profiles_approval_status_check;

ALTER TABLE viajes_driver_profiles 
    ADD CONSTRAINT viajes_driver_profiles_approval_status_check 
    CHECK (approval_status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'));

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_viajes_driver_approval_status 
    ON viajes_driver_profiles (approval_status);
