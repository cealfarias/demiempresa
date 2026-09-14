import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Mercado San Miguelito Delivery API',
    domain: 'sanmiguelito.demiempresa.online',
    timestamp: new Date().toISOString()
  });
});

// GET /api/productos
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, pu.nombre as puesto_nombre, pu.pasillo 
       FROM productos p 
       JOIN puestos pu ON p.puesto_id = pu.id 
       WHERE p.activo = true 
       ORDER BY p.nombre ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar productos:', err);
    res.status(500).json({ error: 'Error de base de datos' });
  }
});

// GET /api/ordenes
app.get('/api/ordenes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordenes ORDER BY creado_en DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error al consultar órdenes:', err);
    res.status(500).json({ error: 'Error de base de datos' });
  }
});

// POST /api/ordenes (Crear Pedido con Pago Anticipado)
app.post('/api/ordenes', async (req, res) => {
  const { cliente_nombre, telefono, direccion, metodo_pago, subtotal, envio, propina_total, total, items } = req.body;
  
  const id = `MSM-${Math.floor(1000 + Math.random() * 9000)}`;
  const propina_recolector = Number((propina_total / 2).toFixed(2));
  const propina_despachador = Number((propina_total - propina_recolector).toFixed(2));

  try {
    await pool.query(
      `INSERT INTO ordenes 
       (id, cliente_nombre, telefono, direccion, metodo_pago, subtotal, envio, propina_total, propina_recolector, propina_despachador, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, cliente_nombre, telefono, direccion, metodo_pago, subtotal, envio || 1.75, propina_total, propina_recolector, propina_despachador, total]
    );

    if (items && items.length > 0) {
      for (const item of items) {
        await pool.query(
          `INSERT INTO orden_items (orden_id, producto_id, puesto_name, pasillo, cantidad, precio_unitario)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.id, item.puestoName, item.pasillo, item.quantity, item.price]
        );
      }
    }

    res.status(201).json({ success: true, orderId: id });
  } catch (err) {
    console.error('Error al crear orden:', err);
    res.status(500).json({ error: 'Error al procesar la orden' });
  }
});

// POST /api/repartidores (Alta de Conductor por Tipo de Vehículo)
app.post('/api/repartidores', async (req, res) => {
  const { nombre, telefono, tipo_transporte, vehiculo } = req.body;
  const id = `desp-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const result = await pool.query(
      `INSERT INTO repartidores (id, nombre, telefono, tipo_transporte, vehiculo)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, nombre, telefono, tipo_transporte, vehiculo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error al registrar repartidor:', err);
    res.status(500).json({ error: 'Error al registrar repartidor' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Mercado San Miguelito API escuchando en el puerto ${PORT}`);
});
