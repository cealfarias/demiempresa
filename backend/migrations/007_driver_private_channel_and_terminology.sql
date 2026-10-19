-- =====================================================================
-- RUMBO: MIGRACIÓN 007 - FRECUENCIA PRIVADA ENTRE COLEGAS Y ACTUALIZACIÓN DE TÉRMINOS
-- 1. Actualización de terminología: "ZONA_CALIENTE" -> "ALTA_DEMANDA" (Puntos con Carreras)
-- 2. Canal privado y red de colegas de confianza entre conductores
-- =====================================================================

-- 1. Actualizar registros existentes con terminología clara y sin ambigüedades
UPDATE viajes_driver_social_posts
SET category = 'ALTA_DEMANDA'
WHERE category = 'ZONA_CALIENTE';

-- 2. Tabla de Colegas de Confianza (Lista de Amigos de Ruta)
CREATE TABLE IF NOT EXISTS viajes_driver_buddies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    buddy_driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_driver_buddy UNIQUE (driver_id, buddy_driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_buddies_driver ON viajes_driver_buddies(driver_id);

-- 3. Mensajes en Frecuencia Privada entre Colegas
CREATE TABLE IF NOT EXISTS viajes_driver_private_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    recipient_driver_id UUID NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE, -- NULL significa canal privado entre su red de amigos
    sender_name VARCHAR(150) NOT NULL DEFAULT 'Colega Rumbo',
    sender_vehicle VARCHAR(100) NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_private_recipient ON viajes_driver_private_messages(recipient_driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_private_sender ON viajes_driver_private_messages(sender_driver_id, created_at DESC);
