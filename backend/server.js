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
    daviviendaPhone: '6989-3101',
    appCommissionRate: '10%',
    coverageRadiusKm: 5,
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

// POST /api/ordenes (Crear Pedido con Pago Anticipado, 10% Comisión App y Pickup QR)
app.post('/api/ordenes', async (req, res) => {
  const { cliente_nombre, telefono, direccion, metodo_pago, tipo_entrega, subtotal, envio, propina_total, total, items } = req.body;
  
  const id = `MSM-${Math.floor(1000 + Math.random() * 9000)}`;
  const comision_app = Number((subtotal * 0.10).toFixed(2)); // 10% Commission
  const propina_recolector = Number((propina_total / 2).toFixed(2));
  const propina_despachador = Number((propina_total - propina_recolector).toFixed(2));
  const codigo_qr = `QR-${id}`;

  try {
    await pool.query(
      `INSERT INTO ordenes 
       (id, cliente_nombre, telefono, direccion, tipo_entrega, codigo_qr, metodo_pago, subtotal, comision_app, envio, propina_total, propina_recolector, propina_despachador, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [id, cliente_nombre, telefono, direccion, tipo_entrega || 'domicilio', codigo_qr, metodo_pago, subtotal, comision_app, envio || 1.75, propina_total, propina_recolector, propina_despachador, total]
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

    res.status(201).json({ success: true, orderId: id, codigoQr: codigo_qr });
  } catch (err) {
    console.error('Error al crear orden:', err);
    res.status(500).json({ error: 'Error al procesar la orden' });
  }
});

// POST /api/ordenes/:id/cancel (Cancelación con 20% de cargo administrativo)
app.post('/api/ordenes/:id/cancel', async (req, res) => {
  const { id } = req.params;

  try {
    const checkResult = await pool.query('SELECT * FROM ordenes WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const order = checkResult.rows[0];
    if (order.estado !== 'Pago Confirmado' && order.estado !== 'En Recolección') {
      return res.status(400).json({ error: 'La orden ya está siendo procesada por el runner o despachador y no se puede cancelar.' });
    }

    const penaltyFee = Number((order.total * 0.20).toFixed(2)); // 20% Fee
    const refundAmount = Number((order.total * 0.80).toFixed(2)); // 80% Refund

    await pool.query(
      `UPDATE ordenes SET estado = 'Cancelado', cargo_cancelacion = $1 WHERE id = $2`,
      [penaltyFee, id]
    );

    res.json({
      success: true,
      message: 'Orden cancelada',
      penaltyFee,
      refundAmount
    });
  } catch (err) {
    console.error('Error al cancelar orden:', err);
    res.status(500).json({ error: 'Error al cancelar la orden' });
  }
});

// POST /api/qr/verify (Verificación de Pickup QR en Acopio)
app.post('/api/qr/verify', async (req, res) => {
  const { codigo_qr } = req.body;

  try {
    const result = await pool.query(
      `SELECT * FROM ordenes WHERE codigo_qr = $1 OR id = $1`,
      [codigo_qr]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Código QR no encontrado o inválido.' });
    }

    const order = result.rows[0];
    await pool.query(`UPDATE ordenes SET estado = 'Entregado (Pickup Validado)' WHERE id = $1`, [order.id]);

    res.json({ success: true, message: 'Retiro en punto verificado exitosamente', order });
  } catch (err) {
    console.error('Error al verificar QR:', err);
    res.status(500).json({ error: 'Error interno de verificación' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API Mercado San Miguelito escuchando en el puerto ${PORT}`);
});
