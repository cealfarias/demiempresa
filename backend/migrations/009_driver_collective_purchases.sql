-- =====================================================================
-- RUMBO: MIGRACIÓN 009 - CLUB DE COMPRAS COLECTIVAS DE MANTENIMIENTO Y SERVICIOS
-- Pagos 100% anticipados vía Transfer365 Móvil (Davivienda 69893101 - Cesar Arias),
-- Emisión de Tickets Digitales de Retiro y Encuesta de Demanda Semanal.
-- =====================================================================

-- 1. LOTES / OFERTAS COLECTIVAS DE LA SEMANA
CREATE TABLE IF NOT EXISTS viajes_driver_group_deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'MANTENIMIENTO', 'REPUESTOS', 'LEGAL', 'SEGUROS'
    supplier_name VARCHAR(150) NOT NULL,
    supplier_address VARCHAR(200) NULL,
    supplier_phone VARCHAR(25) NULL,
    normal_price NUMERIC(8,2) NOT NULL,
    group_price NUMERIC(8,2) NOT NULL,
    savings_amount NUMERIC(8,2) GENERATED ALWAYS AS (normal_price - group_price) STORED,
    min_participants INT NOT NULL DEFAULT 10,
    current_paid_count INT NOT NULL DEFAULT 0,
    payment_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN_PAYMENT', -- 'OPEN_PAYMENT', 'CLOSED', 'FULFILLED'
    terms_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_deals_status ON viajes_driver_group_deals(status, payment_deadline);

-- 2. PEDIDOS PAGADOS Y ASEGURADOS CON TRANSFER365 MÓVIL
CREATE TABLE IF NOT EXISTS viajes_driver_deal_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES viajes_driver_group_deals(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_plate VARCHAR(30) NOT NULL,
    amount_paid NUMERIC(8,2) NOT NULL,
    bank_name VARCHAR(50) NOT NULL DEFAULT 'DAVIVIENDA',
    transfer_phone VARCHAR(20) NOT NULL DEFAULT '69893101',
    account_holder VARCHAR(100) NOT NULL DEFAULT 'Cesar Arias',
    transfer_reference VARCHAR(100) NOT NULL,
    transfer_proof_url TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PAID_VERIFIED', -- 'PENDING_VERIFICATION', 'PAID_VERIFIED', 'COLLECTED'
    redemption_code VARCHAR(30) NOT NULL UNIQUE,
    collected_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deal_orders_driver ON viajes_driver_deal_orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_deal_orders_redemption ON viajes_driver_deal_orders(redemption_code);

-- 3. ENCUESTA Y REGISTRO DE DEMANDA SEMANAL ("¿Qué necesita tu auto la otra semana?")
CREATE TABLE IF NOT EXISTS viajes_driver_demand_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES viajes_driver_profiles(id) ON DELETE CASCADE,
    driver_name VARCHAR(150) NOT NULL,
    vehicle_info VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'FRENOS', 'LLANTAS', 'BATERIAS', 'ACEITE_FILTROS', 'SUSPENSION', 'LEGAL_TRASPASO', 'OTRO'
    item_description TEXT NOT NULL,
    urgency VARCHAR(30) NOT NULL DEFAULT 'ESTA_SEMANA', -- 'URGENTE_48H', 'ESTA_SEMANA', 'PROXIMA_SEMANA'
    status VARCHAR(30) NOT NULL DEFAULT 'GATHERING_DEMAND',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_demand_cat ON viajes_driver_demand_requests(category, status);

-- 4. SEMILLAS DEMO REALISTAS DE LOTES COLECTIVOS
INSERT INTO viajes_driver_group_deals (
    title, category, supplier_name, supplier_address, supplier_phone,
    normal_price, group_price, min_participants, current_paid_count,
    payment_deadline, delivery_date, terms_details
)
VALUES
    (
        'Lote #1: Cambio de Aceite Valvoline/Mobil + Filtro + Revisión de Frenos',
        'MANTENIMIENTO',
        'Lubricentro & Taller Aliado Rumbo',
        'Alameda Juan Pablo II, frente a Parque Infantil, San Salvador',
        '50322223344',
        32.00,
        19.50,
        30,
        18,
        CURRENT_TIMESTAMP + INTERVAL '4 days',
        CURRENT_DATE + INTERVAL '5 days',
        'Incluye 4 cuartos de aceite semisintético o mineral según año de vehículo, filtro de aceite nuevo y purga completa.'
    ),
    (
        'Lote #2: Combo de 2 Llantas Nuevas (Rin 14 o Rin 15) con Montaje y Válvula',
        'REPUESTOS',
        'Distribuidora de Llantas Mayorista El Salvador',
        'Bulevar del Ejército km 4.5, Soyapango',
        '50322556677',
        90.00,
        62.00,
        20,
        12,
        CURRENT_TIMESTAMP + INTERVAL '5 days',
        CURRENT_DATE + INTERVAL '6 days',
        'Llantas de alto kilometraje con garantía de 40,000 km. Montaje y balanceo computarizado incluido.'
    ),
    (
        'Lote #3: Combo Notarial: Traspaso Completo de Vehículo ante CNR',
        'LEGAL',
        'Bufete Jurídico Asociado Rumbo',
        'Colonia Médica, Pasaje 2 #14, San Salvador',
        '50322119988',
        35.00,
        15.00,
        15,
        9,
        CURRENT_TIMESTAMP + INTERVAL '6 days',
        CURRENT_DATE + INTERVAL '7 days',
        'Redacción de escritura matriz de compraventa, protocolización y asesoría completa de impuestos SERTRACEN/CNR.'
    )
ON CONFLICT DO NOTHING;
