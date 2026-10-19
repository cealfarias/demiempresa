-- =====================================================================
-- RUMBO: MIGRACIÓN 006 - RED SOCIAL & RADIO DE RUTA PARA CONDUCTORES
-- Alertas viales en tiempo real (retenes, obras, accidentes, inundaciones),
-- Radar de zonas calientes, Auxilio Vial SOS entre colegas y Directorio de Talleres/Llanterías.
-- =====================================================================

CREATE TABLE IF NOT EXISTS viajes_driver_social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES viajes_driver_profiles(id) ON DELETE SET NULL,
    driver_name VARCHAR(150) NOT NULL DEFAULT 'Conductor Rumbo',
    vehicle_info VARCHAR(100) NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'ALERTA_VIAL', -- 'ALERTA_VIAL', 'ZONA_CALIENTE', 'AUXILIO_SOS', 'TALLER_LLANTERIA', 'CHARLA_RUTERA'
    sub_type VARCHAR(50) NOT NULL DEFAULT 'TRAFICO', -- 'RETEN', 'ACCIDENTE', 'OBRAS', 'INUNDACION', 'LLANTERIA', 'BATERIA_SOS'
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location_name VARCHAR(150) NOT NULL,
    municipality VARCHAR(100) NOT NULL DEFAULT 'San Salvador',
    urgency VARCHAR(20) NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'HIGH', 'CRITICAL_SOS'
    driver_phone VARCHAR(20) NULL,
    confirmations_count INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '8 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_social_category ON viajes_driver_social_posts(category, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_social_municipality ON viajes_driver_social_posts(municipality);
CREATE INDEX IF NOT EXISTS idx_driver_social_active ON viajes_driver_social_posts(is_active, expires_at);

-- Confirmaciones de otros choferes ("A mí también me consta / Sigue ahí")
CREATE TABLE IF NOT EXISTS viajes_driver_social_confirmations (
    post_id UUID NOT NULL REFERENCES viajes_driver_social_posts(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, driver_id)
);

-- Semillas iniciales realistas para conductores salvadoreños
INSERT INTO viajes_driver_social_posts (
    driver_name, vehicle_info, category, sub_type, title, description, location_name, municipality, urgency, confirmations_count
)
VALUES
    ('Don Manuel (Chofer #12)', 'Nissan Versa (P-782190)', 'ALERTA_VIAL', 'RETEN', 'Control vehicular y revisión de documentos', 'Revisión ágil pero hay fila de 10 autos en carril derecho subiendo hacia Santa Tecla.', 'Bulevar Monseñor Romero, paso a desnivel', 'Santa Tecla', 'HIGH', 5),
    
    ('Roberto Gómez', 'Toyota Corolla (P-443912)', 'ZONA_CALIENTE', 'DEMANDA', 'Alta demanda de pasajeros en salida de centro comercial', 'Hay bastante gente pidiendo viajes hacia Soyapango e Ilopango con ofertas atractivas en efectivo.', 'Plaza Mundo Soyapango, salida peatonal', 'Soyapango', 'NORMAL', 8),

    ('Víctor Cruz', 'Kia Rio (P-559021)', 'TALLER_LLANTERIA', 'LLANTERIA', 'Llantería 24/7 abierta con parches al instante', 'Llantería El Paisa con aire calibrado y parches en frío a $3.00. Atienden rápido a cualquier hora.', 'Carretera Troncal del Norte km 8', 'Ciudad Delgado', 'NORMAL', 3),

    ('Marvin Lemus', 'Hyundai Elantra (P-902341)', 'AUXILIO_SOS', 'BATERIA_SOS', 'Batería descargada, ¿quién anda cerca con cables?', 'Me quedé sin carga al esperar pasajero frente a gasolinera. Traigo cables o si alguien me pasa corriente.', 'Frente a Texaco Los Héroes', 'San Salvador', 'CRITICAL_SOS', 2)
ON CONFLICT DO NOTHING;
