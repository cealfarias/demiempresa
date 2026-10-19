-- =====================================================================
-- RUMBO A MI DESTINO: MIGRACIÓN 005 - RED SOCIAL HIPERLOCAL & ARCADE EN TRAYECTO
-- Comunidades de afinidad (Turismo, Gastronomía, Parejas/Moteles, Noches),
-- Auto-grafo de contactos vía referidos, spots geolocalizados y gamificación.
-- =====================================================================

-- 1. RED DE CONTACTOS Y AMISTADES AUTOMÁTICAS (Grafo Social)
CREATE TABLE IF NOT EXISTS viajes_social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
    connection_type VARCHAR(30) NOT NULL DEFAULT 'REFERRAL', -- 'REFERRAL', 'ORGANIC_FRIEND'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_social_connection UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_social_connections_a ON viajes_social_connections(user_a_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_b ON viajes_social_connections(user_b_id);

-- Función y Trigger para auto-conectar referente y referido bidireccionalmente
CREATE OR REPLACE FUNCTION fn_auto_create_social_connection()
RETURNS TRIGGER AS $$
BEGIN
    -- Conexión de A hacia B
    INSERT INTO viajes_social_connections (user_a_id, user_b_id, connection_type)
    VALUES (NEW.referrer_user_id, NEW.referred_user_id, 'REFERRAL')
    ON CONFLICT (user_a_id, user_b_id) DO NOTHING;

    -- Conexión recíproca de B hacia A
    INSERT INTO viajes_social_connections (user_a_id, user_b_id, connection_type)
    VALUES (NEW.referred_user_id, NEW.referrer_user_id, 'REFERRAL')
    ON CONFLICT (user_a_id, user_b_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_social_connection ON viajes_referrals;
CREATE TRIGGER trg_auto_create_social_connection
    AFTER INSERT ON viajes_referrals
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_create_social_connection();

-- Auto-poblar conexiones existentes desde viajes_referrals históricos
INSERT INTO viajes_social_connections (user_a_id, user_b_id, connection_type)
SELECT referrer_user_id, referred_user_id, 'REFERRAL'
FROM viajes_referrals
ON CONFLICT (user_a_id, user_b_id) DO NOTHING;

INSERT INTO viajes_social_connections (user_a_id, user_b_id, connection_type)
SELECT referred_user_id, referrer_user_id, 'REFERRAL'
FROM viajes_referrals
ON CONFLICT (user_a_id, user_b_id) DO NOTHING;


-- 2. COMUNIDADES TEMÁTICAS AFINES
CREATE TABLE IF NOT EXISTS viajes_social_communities (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(50) NOT NULL,
    tagline VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Semillas de Comunidades
INSERT INTO viajes_social_communities (id, name, description, icon, tagline)
VALUES
    ('turismo-interno', '🏖️ Rutas & Turismo', 'Playas, miradores, volcanes, lagos y pueblos mágicos con viajes planificados o de fin de semana.', 'MapPin', 'Descubre rincones de El Salvador'),
    ('gastronomia', '🍔 Cenas, Almuerzos & Cafés', 'Las mejores pupuserías, restaurantes, huecas de comida y promociones 2x1.', 'Utensils', 'Sabor salvadoreño garantizado'),
    ('vida-nocturna', '🎉 Noches & Fiestas', 'Bares, eventos musicales, conciertos y discotecas con viaje seguro garantizado de ida y vuelta.', 'PartyPopper', 'La noche es joven y segura'),
    ('escapadas-parejas', '🤫 Escapadas & Parejas', 'Moteles discretos, cabañas románticas y glamping con total privacidad, reserva y pago en efectivo.', 'Heart', 'Privacidad y confort'),
    ('distracciones', '⚡ Eventos & Distracciones', 'Centros comerciales, ferias familiares, cines, parques y planes para romper la rutina.', 'Sparkles', 'Planes de hoy')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    tagline = EXCLUDED.tagline;


-- 3. MURO DE PUBLICACIONES Y SPOTS (RUMBO A MI DESTINO)
CREATE TABLE IF NOT EXISTS viajes_social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES viajes_users(id) ON DELETE SET NULL,
    community_id VARCHAR(50) NOT NULL REFERENCES viajes_social_communities(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    hook VARCHAR(200),
    media_url TEXT,
    media_type VARCHAR(20) NOT NULL DEFAULT 'IMAGE', -- 'IMAGE', 'VIDEO'
    location_name VARCHAR(150) NOT NULL,
    location_lat NUMERIC(10, 7),
    location_lng NUMERIC(10, 7),
    municipality VARCHAR(100) NOT NULL DEFAULT 'San Salvador',
    privacy VARCHAR(20) NOT NULL DEFAULT 'PUBLIC', -- 'PUBLIC', 'CONTACTS_ONLY', 'ANONYMOUS'
    anonymous_alias VARCHAR(100) NULL,
    merchant_id UUID REFERENCES viajes_merchants(id) ON DELETE SET NULL,
    likes_count INT NOT NULL DEFAULT 0,
    shares_count INT NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_posts_community ON viajes_social_posts(community_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_author ON viajes_social_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_muni ON viajes_social_posts(municipality);

-- Reacciones / Likes
CREATE TABLE IF NOT EXISTS viajes_social_likes (
    post_id UUID NOT NULL REFERENCES viajes_social_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id)
);


-- 4. ZONA ARCADE EN TRAYECTO & BONOS DE GAMIFICACIÓN
CREATE TABLE IF NOT EXISTS viajes_arcade_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES viajes_trips(id) ON DELETE SET NULL,
    game_type VARCHAR(30) NOT NULL, -- 'WHEEL_OF_FORTUNE', 'TRIVIA_LOCAL', 'SCRATCH_CARD'
    points_won INT NOT NULL DEFAULT 0,
    bonus_amount NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    reward_description VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_arcade_rewards_user ON viajes_arcade_rewards(user_id);

-- Saldo acumulado de puntos de usuario
CREATE TABLE IF NOT EXISTS viajes_user_reward_balance (
    user_id UUID PRIMARY KEY REFERENCES viajes_users(id) ON DELETE CASCADE,
    accumulated_points INT NOT NULL DEFAULT 0 CHECK (accumulated_points >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 5. SEMILLAS DEMO DE SPOTS Y PUBLICACIONES REALES EN EL SALVADOR
DO $$
DECLARE
    comm_turismo VARCHAR(50) := 'turismo-interno';
    comm_gastro VARCHAR(50) := 'gastronomia';
    comm_noche VARCHAR(50) := 'vida-nocturna';
    comm_parejas VARCHAR(50) := 'escapadas-parejas';
BEGIN
    INSERT INTO viajes_social_posts (community_id, title, description, hook, location_name, municipality, privacy, likes_count, is_pinned)
    VALUES
        (comm_gastro, 'Las Mejores Pupusas de Arroz en Olocuilta', 'Pupusería El Triángulo: pupusas de queso con loroco, chicharrón y ayote recién hechas al comal de barro. ¡Pide tu viaje directo!', 'El auténtico sabor tradicional a pie de carretera', 'Pupusería El Triángulo, Olocuilta', 'Olocuilta', 'PUBLIC', 48, TRUE),
        
        (comm_turismo, 'Mirador El Boquerón & Parque Nacional', 'Clima fresco de montaña a solo 25 minutos. Cafeterías con vista a la ciudad y senderos al cráter. Ideal para fin de semana.', 'Respira aire puro y desconéctate de la rutina', 'Parque Nacional El Boquerón', 'Santa Tecla', 'PUBLIC', 89, TRUE),

        (comm_noche, 'Noche Acústica en Paseo El Carmen', 'Música en vivo, gastronomía nocturna y ambiente seguro para compartir con amigos o en pareja. Te llevamos y traemos seguro.', 'Vive el ambiente bohemio de Santa Tecla', 'Paseo El Carmen', 'Santa Tecla', 'PUBLIC', 35, FALSE),

        (comm_parejas, 'Cabaña Mirador Los Planes - Total Privacidad', 'Habitaciones con jacuzzi privado, vista nocturna al valle, cortinas blackout y servicio de comida al cuarto. Pago 100% en efectivo.', 'Tu escape perfecto sin preguntas y con máxima discreción', 'Zona Residencial Los Planes', 'Panchimalco', 'ANONYMOUS', 62, FALSE)
    ON CONFLICT DO NOTHING;
END $$;
