-- ============================================================
-- SCRIPT DE MIGRACIÓN POSTGRESQL: MERCADO SAN MIGUELITO
-- ============================================================

-- 1. TABLA DE PUESTOS DEL MERCADO
CREATE TABLE IF NOT EXISTS puestos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    pasillo VARCHAR(100) NOT NULL,
    rating NUMERIC(3, 2) DEFAULT 4.8,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE PRODUCTOS Y PRECIOS POR PUESTO
CREATE TABLE IF NOT EXISTS productos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    departamento_id VARCHAR(50) NOT NULL,
    linea_id VARCHAR(50) NOT NULL,
    puesto_id VARCHAR(50) REFERENCES puestos(id),
    precio NUMERIC(8, 2) NOT NULL,
    unidad VARCHAR(50) DEFAULT 'unidad',
    imagen TEXT,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLA DE REPARTIDORES Y TRANSPORTISTAS
CREATE TABLE IF NOT EXISTS repartidores (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    tipo_transporte VARCHAR(30) CHECK (tipo_transporte IN ('apie', 'bicicleta', 'moto', 'carro')),
    vehiculo VARCHAR(200),
    estado VARCHAR(30) DEFAULT 'Disponible',
    entregas_realizadas INT DEFAULT 0,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE ÓRDENES Y PAGOS ANTICIPADOS
CREATE TABLE IF NOT EXISTS ordenes (
    id VARCHAR(50) PRIMARY KEY,
    cliente_nombre VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion TEXT NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL, -- Transfer365 Móvil, Chivo Wallet, Cubo Pago
    estado VARCHAR(50) DEFAULT 'En Recolección', -- En Recolección, En Centro Acopio, En Camino, Entregado
    subtotal NUMERIC(8, 2) NOT NULL,
    envio NUMERIC(8, 2) DEFAULT 1.75,
    propina_total NUMERIC(8, 2) DEFAULT 1.00,
    propina_recolector NUMERIC(8, 2) DEFAULT 0.50,
    propina_despachador NUMERIC(8, 2) DEFAULT 0.50,
    total NUMERIC(8, 2) NOT NULL,
    recolector_id VARCHAR(50) REFERENCES repartidores(id),
    despachador_id VARCHAR(50) REFERENCES repartidores(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. DETALLE DE PRODUCTOS EN ÓRDENES
CREATE TABLE IF NOT EXISTS orden_items (
    id SERIAL PRIMARY KEY,
    orden_id VARCHAR(50) REFERENCES ordenes(id) ON DELETE CASCADE,
    producto_id VARCHAR(50) REFERENCES productos(id),
    puesto_name VARCHAR(150),
    pasillo VARCHAR(100),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(8, 2) NOT NULL,
    recolectado BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- DATOS INICIALES DE PRUEBA
-- ============================================================
INSERT INTO puestos (id, nombre, pasillo) VALUES
('p1', 'Pupusería Doña Chilo', 'Pasillo 3, Puesto #42'),
('p2', 'Pupusería San Miguelito', 'Pasillo 3, Puesto #45'),
('p3', 'Sopas y Comedero El Güero', 'Pasillo 2, Puesto #18'),
('p4', 'Frutería El Carmen', 'Pasillo 1, Puesto #05')
ON CONFLICT (id) DO NOTHING;

INSERT INTO repartidores (id, nombre, telefono, tipo_transporte, vehiculo) VALUES
('rec-01', 'Chepe Gómez', '7100-2211', 'apie', 'Runner Mercado (Coche mano)'),
('desp-01', 'Kevin Rivera', '7822-4455', 'moto', 'Motocicleta Honda Cargo 150 - Placa M-492102')
ON CONFLICT (id) DO NOTHING;
