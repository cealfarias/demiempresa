-- ============================================================
-- ESQUEMA RELACIONAL POSTGRESQL: DEMIEMPRESA.ONLINE
-- Plataforma de Viajes, Despacho Geoespacial y Hub Comercial B2B
-- Prefijo de Tablas y Tipos: viajes_ (para coexistir en BD compartida)
-- ============================================================

-- 1. TIPOS ENUMERADOS (PREFIJO viajes_)
DO $$ BEGIN
    CREATE TYPE viajes_user_role AS ENUM ('PASSENGER', 'DRIVER', 'MERCHANT', 'ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_subscription_status AS ENUM ('TRIAL', 'PAID', 'PENDING', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_referral_type AS ENUM ('PASSENGER_TO_PASSENGER', 'DRIVER_TO_PASSENGER_QR', 'DRIVER_TO_DRIVER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_referral_status AS ENUM ('PENDING_ACTIVATION', 'ACTIVATED', 'ACTIVATION_EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_credit_status AS ENUM ('AVAILABLE', 'REDEEMED', 'CREDIT_EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_service_type AS ENUM ('PASSENGER', 'PACKAGE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_payment_timing AS ENUM ('AT_ORIGIN', 'ON_DELIVERY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_trip_status AS ENUM ('REQUESTED', 'OFFERING', 'ACCEPTED', 'ARRIVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_offer_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_merchant_status AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_ad_plan_type AS ENUM ('VITRINA', 'IMPACTO', 'COMBO_FULL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_billing_period AS ENUM ('WEEKLY', 'MONTHLY');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_ad_campaign_status AS ENUM ('PENDING_CREATIVE', 'ACTIVE', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viajes_ad_creative_type AS ENUM ('BANNER', 'REEL_VIDEO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLA DE USUARIOS (PASAJEROS / CLIENTES)
CREATE TABLE IF NOT EXISTS viajes_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    dui VARCHAR(10) UNIQUE, -- Formato: 00000000-0
    role viajes_user_role NOT NULL DEFAULT 'PASSENGER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PERFILES DE CONDUCTORES (APK ANDROID)
CREATE TABLE IF NOT EXISTS viajes_driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES viajes_users(id) ON DELETE CASCADE,
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_brand VARCHAR(50) NOT NULL,
    vehicle_model VARCHAR(50) NOT NULL,
    vehicle_color VARCHAR(30) NOT NULL,
    photo_url TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),
    current_week_start DATE NOT NULL DEFAULT CURRENT_DATE,
    current_week_bonuses_count INT NOT NULL DEFAULT 0 CHECK (current_week_bonuses_count BETWEEN 0 AND 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. SUSCRIPCIONES Y LIQUIDACIÓN SEMANAL DEL CONDUCTOR
CREATE TABLE IF NOT EXISTS viajes_driver_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    base_fee NUMERIC(6,2) NOT NULL DEFAULT 10.00,
    bonuses_count INT NOT NULL DEFAULT 0 CHECK (bonuses_count BETWEEN 0 AND 10),
    bonus_deduction NUMERIC(6,2) GENERATED ALWAYS AS (bonuses_count * 1.00) STORED,
    net_fee_paid NUMERIC(6,2) NOT NULL DEFAULT 10.00 CHECK (net_fee_paid >= 0.00),
    status viajes_subscription_status NOT NULL DEFAULT 'PAID',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_viajes_driver_week UNIQUE (driver_id, week_start_date)
);

-- 5. PROGRAMA DE REFERIDOS (DOBLE PRESIÓN TEMPORAL 7 + 7 DÍAS)
CREATE TABLE IF NOT EXISTS viajes_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
    referred_user_id UUID NOT NULL UNIQUE REFERENCES viajes_users(id) ON DELETE CASCADE,
    referral_type viajes_referral_type NOT NULL DEFAULT 'PASSENGER_TO_PASSENGER',
    status viajes_referral_status NOT NULL DEFAULT 'PENDING_ACTIVATION',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activation_deadline TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    activated_at TIMESTAMP WITH TIME ZONE,
    qualifying_trip_id UUID
);

-- 6. CRÉDITOS ASIGNADOS A USUARIOS ($1.00 CON TTL 7 DÍAS)
CREATE TABLE IF NOT EXISTS viajes_user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES viajes_users(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES viajes_referrals(id) ON DELETE SET NULL,
    amount NUMERIC(4,2) NOT NULL DEFAULT 1.00 CHECK (amount = 1.00),
    status viajes_credit_status NOT NULL DEFAULT 'AVAILABLE',
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    credit_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    redeemed_at TIMESTAMP WITH TIME ZONE,
    redeemed_trip_id UUID
);

-- 7. VIAJES Y ENCOMIENDAS (PUNTO A PUNTO)
CREATE TABLE IF NOT EXISTS viajes_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type viajes_service_type NOT NULL DEFAULT 'PASSENGER',
    passenger_id UUID NOT NULL REFERENCES viajes_users(id),
    driver_id UUID REFERENCES viajes_driver_profiles(id),
    origin_address TEXT NOT NULL,
    origin_lat NUMERIC(10,7) NOT NULL,
    origin_lng NUMERIC(10,7) NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat NUMERIC(10,7) NOT NULL,
    destination_lng NUMERIC(10,7) NOT NULL,
    destination_municipality VARCHAR(100) NOT NULL,
    proposed_fare NUMERIC(6,2) NOT NULL CHECK (proposed_fare > 0),
    agreed_fare NUMERIC(6,2) CHECK (agreed_fare > 0),
    credit_applied NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (credit_applied IN (0.00, 1.00)),
    cash_to_collect NUMERIC(6,2),
    package_details TEXT,
    payment_timing viajes_payment_timing DEFAULT 'AT_ORIGIN',
    status viajes_trip_status NOT NULL DEFAULT 'REQUESTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. OFERTAS DE CONDUCTORES (CON TTL DE 10 SEGUNDOS)
CREATE TABLE IF NOT EXISTS viajes_trip_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES viajes_trips(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    proposed_fare NUMERIC(6,2) NOT NULL,
    status viajes_offer_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 seconds'),
    CONSTRAINT uq_viajes_trip_driver_offer UNIQUE (trip_id, driver_id, created_at)
);

-- 9. MÓDULO B2B (COMERCIANTES, TARIFAS Y PUBLICIDAD)
CREATE TABLE IF NOT EXISTS viajes_merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES viajes_users(id) ON DELETE SET NULL,
    business_name VARCHAR(150) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    municipality VARCHAR(100) NOT NULL,
    status viajes_merchant_status NOT NULL DEFAULT 'LEAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viajes_ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES viajes_merchants(id) ON DELETE CASCADE,
    plan_type viajes_ad_plan_type NOT NULL,
    billing_frequency viajes_billing_period NOT NULL,
    price NUMERIC(6,2) NOT NULL CHECK (price IN (7.50, 12.50, 17.50, 25.00, 45.00, 60.00)),
    starts_at DATE NOT NULL,
    ends_at DATE NOT NULL,
    status viajes_ad_campaign_status NOT NULL DEFAULT 'PENDING_CREATIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viajes_ad_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES viajes_ad_campaigns(id) ON DELETE CASCADE,
    creative_type viajes_ad_creative_type NOT NULL,
    media_url TEXT NOT NULL,
    target_link TEXT,
    target_municipality VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viajes_ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creative_id UUID NOT NULL REFERENCES viajes_ad_creatives(id) ON DELETE CASCADE,
    trip_id UUID NOT NULL REFERENCES viajes_trips(id) ON DELETE CASCADE,
    viewer_user_id UUID REFERENCES viajes_users(id),
    displayed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9.1 ESTACIONES DE GASOLINA Y MONITOREO DE PRECIOS EN EL SALVADOR
ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS vehicle_year INT DEFAULT 2018;
ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS fuel_type VARCHAR(20) DEFAULT 'REGULAR';
ALTER TABLE viajes_driver_profiles ADD COLUMN IF NOT EXISTS fuel_km_per_gallon NUMERIC(5,2) DEFAULT 42.0;

CREATE TABLE IF NOT EXISTS viajes_gas_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand VARCHAR(50) NOT NULL, -- 'Puma', 'Texaco', 'Uno', 'DLC', 'Alba'
    station_name VARCHAR(150) NOT NULL,
    address VARCHAR(200) NOT NULL,
    municipality VARCHAR(50) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    regular_price NUMERIC(4,2) NOT NULL DEFAULT 3.80,
    especial_price NUMERIC(4,2) NOT NULL DEFAULT 4.15,
    diesel_price NUMERIC(4,2) NOT NULL DEFAULT 3.48,
    gov_regular_price NUMERIC(4,2) NOT NULL DEFAULT 3.82,
    gov_especial_price NUMERIC(4,2) NOT NULL DEFAULT 4.18,
    gov_diesel_price NUMERIC(4,2) NOT NULL DEFAULT 3.52,
    verified_reports_count INT NOT NULL DEFAULT 1,
    last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viajes_gas_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES viajes_gas_stations(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES viajes_driver_profiles(id) ON DELETE SET NULL,
    fuel_type VARCHAR(20) NOT NULL,
    reported_price NUMERIC(4,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ÍNDICES DE CONCURRENCIA Y RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_viajes_users_phone ON viajes_users(phone);
CREATE INDEX IF NOT EXISTS idx_viajes_driver_profiles_active ON viajes_driver_profiles(is_active, is_online);
CREATE INDEX IF NOT EXISTS idx_viajes_trips_status ON viajes_trips(status);
CREATE INDEX IF NOT EXISTS idx_viajes_trips_driver_status ON viajes_trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_viajes_trip_offers_active ON viajes_trip_offers(trip_id, status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_viajes_referrals_deadline ON viajes_referrals(activation_deadline) WHERE status = 'PENDING_ACTIVATION';
CREATE INDEX IF NOT EXISTS idx_viajes_user_credits_exp ON viajes_user_credits(credit_expires_at) WHERE status = 'AVAILABLE';
CREATE INDEX IF NOT EXISTS idx_viajes_creatives_muni ON viajes_ad_creatives(target_municipality, is_active);

-- 11. DATOS SEMILLA AUTOMÁTICOS (CHOFER DEMO Y CAMPAÑAS B2B INICIALES)
DO $$
DECLARE
    v_driver_user_id UUID;
    v_merchant_id UUID;
    v_campaign_id UUID;
BEGIN
    -- Conductor oficial demo (Carlos Mendoza, Toyota Corolla, Placa P-584-912)
    IF NOT EXISTS (SELECT 1 FROM viajes_users WHERE dui = '01234567-8') THEN
        INSERT INTO viajes_users (full_name, phone, dui, role)
        VALUES ('Carlos Mendoza', '7123-4567', '01234567-8', 'DRIVER')
        RETURNING id INTO v_driver_user_id;

        INSERT INTO viajes_driver_profiles (
            user_id, vehicle_plate, vehicle_brand, vehicle_model, vehicle_color, photo_url, is_active, is_online, current_week_bonuses_count
        ) VALUES (
            v_driver_user_id,
            'P-584-912',
            'Toyota',
            'Corolla 2021',
            'Gris Plata',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
            TRUE,
            TRUE,
            3
        );
    END IF;

    -- Comercio B2B inicial demo (Tacos & Pupusas Don Toño)
    IF NOT EXISTS (SELECT 1 FROM viajes_merchants WHERE business_name = 'Tacos & Pupusas Don Toño') THEN
        INSERT INTO viajes_merchants (business_name, whatsapp, municipality, status)
        VALUES ('Tacos & Pupusas Don Toño', '6989-3101', 'Santa Tecla', 'ACTIVE')
        RETURNING id INTO v_merchant_id;

        INSERT INTO viajes_ad_campaigns (merchant_id, plan_type, billing_frequency, price, starts_at, ends_at, status)
        VALUES (
            v_merchant_id,
            'IMPACTO',
            'MONTHLY',
            45.00,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            'ACTIVE'
        ) RETURNING id INTO v_campaign_id;

        INSERT INTO viajes_ad_creatives (campaign_id, creative_type, media_url, target_link, target_municipality, is_active)
        VALUES (
            v_campaign_id,
            'REEL_VIDEO',
            'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
            'https://wa.me/50369893101?text=Hola,%20vi%20su%20promocion%20en%20demiempresa.online',
            'Santa Tecla',
            TRUE
        );
    END IF;

    -- Gasolineras Semilla con Precios Oficiales de El Salvador y Precios Confirmados
    IF NOT EXISTS (SELECT 1 FROM viajes_gas_stations LIMIT 1) THEN
        INSERT INTO viajes_gas_stations (brand, station_name, address, municipality, lat, lng, regular_price, especial_price, diesel_price, gov_regular_price, gov_especial_price, gov_diesel_price, verified_reports_count)
        VALUES
        ('Puma', 'Puma Metrocentro Los Héroes', 'Boulevard de Los Héroes, San Salvador', 'San Salvador', 13.7025, -89.2150, 3.75, 4.10, 3.44, 3.82, 4.18, 3.52, 12),
        ('Texaco', 'Texaco Los Héroes', 'Blvd. Los Héroes y Calle Gabriela Mistral', 'San Salvador', 13.7040, -89.2140, 3.78, 4.12, 3.47, 3.82, 4.18, 3.52, 8),
        ('Uno', 'Uno Salvador del Mundo', 'Alameda Roosevelt y Plaza Las Américas', 'San Salvador', 13.7013, -89.2244, 3.79, 4.14, 3.48, 3.82, 4.18, 3.52, 6),
        ('DLC', 'DLC Constitución', 'Boulevard Constitución y Calle Los Sisimiles', 'San Salvador', 13.7150, -89.2280, 3.72, 4.08, 3.42, 3.82, 4.18, 3.52, 19),
        ('Puma', 'Puma Santa Tecla Panamericana', 'Carretera Panamericana frente a La Joya', 'Santa Tecla', 13.6738, -89.2789, 3.74, 4.09, 3.45, 3.82, 4.18, 3.52, 14),
        ('Texaco', 'Texaco Las Delicias', 'Final 4a Calle Poniente, Las Delicias', 'Santa Tecla', 13.6680, -89.2920, 3.80, 4.16, 3.50, 3.82, 4.18, 3.52, 5),
        ('Uno', 'Uno Soyapango Blvd. del Ejército', 'Boulevard del Ejército Km 4.5', 'Soyapango', 13.7080, -89.1550, 3.76, 4.11, 3.46, 3.82, 4.18, 3.52, 11);
    END IF;
END $$;
