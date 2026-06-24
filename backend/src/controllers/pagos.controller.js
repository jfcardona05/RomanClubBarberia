import crypto from 'crypto';
import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { resolverServicios, hayChoque, sumarMinutos, guardarCitaServicios } from './citas.controller.js';
import { upsertCliente } from './clientes.controller.js';
import {
  construirCheckoutUrl, consultarTransaccion, validarEvento, pagosHabilitados, configPublica, ABONO_PORCENTAJE,
} from '../services/wompi.service.js';
import { enviarWhatsapp } from '../services/whatsapp.service.js';
import { msgConfirmacionPago } from '../services/mensajes.js';

// GET /api/pagos/config
export const config = asyncHandler(async (_req, res) => {
  res.json({ ok: true, ...configPublica() });
});

// POST /api/pagos/iniciar
// NO crea la cita: guarda la reserva como PENDIENTE y devuelve la URL de Wompi.
// La cita se crea SOLO cuando el pago es aprobado (confirmar/webhook).
export const iniciar = asyncHandler(async (req, res) => {
  if (!pagosHabilitados()) throw new ApiError(400, 'Los pagos en línea no están habilitados.');

  const {
    nombre_cliente, telefono_cliente, documento_cliente, email_cliente,
    servicios, id_empleado, fecha, hora_inicio, comentarios_cliente, tipo_pago = 'ABONO',
  } = req.body;
  if (!nombre_cliente || !telefono_cliente || !fecha || !hora_inicio) throw new ApiError(400, 'Faltan datos de la reserva.');
  if (!['ABONO', 'TOTAL'].includes(tipo_pago)) throw new ApiError(400, 'Tipo de pago inválido.');

  const { totalDur, totalPrecio } = await resolverServicios({ servicios });
  if (!totalPrecio || totalPrecio <= 0) throw new ApiError(400, 'El total a pagar debe ser mayor a cero.');

  const monto = tipo_pago === 'TOTAL' ? totalPrecio : Math.round(totalPrecio * (ABONO_PORCENTAJE / 100));
  const montoEnCentavos = Math.round(monto * 100);
  const hora_fin = sumarMinutos(hora_inicio, totalDur);

  // Solo para no ofrecer un horario ya ocupado (no reserva todavía)
  if (id_empleado && await hayChoque({ id_empleado, fecha, hora_inicio, hora_fin })) {
    throw new ApiError(409, 'Ese horario acaba de ser tomado. Elige otro.');
  }

  const referencia = `RCB-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const datos = { nombre_cliente, telefono_cliente, documento_cliente, email_cliente,
                  servicios, id_empleado, fecha, hora_inicio, comentarios_cliente };

  await pool.query(
    'INSERT INTO reservas_pendientes (referencia, datos, monto, monto_total, tipo_pago) VALUES (?,?,?,?,?)',
    [referencia, JSON.stringify(datos), monto, totalPrecio, tipo_pago]
  );

  // Wompi vuelve al BACKEND (no a "localhost", que el WAF bloquea). El backend confirma
  // y reenvía al frontend. Wompi le agrega ?id=<transaccion>.
  const redirectUrl = process.env.WOMPI_RETURN_URL || 'http://lvh.me:4000/api/pagos/retorno';
  const checkout_url = construirCheckoutUrl({
    referencia, montoEnCentavos, redirectUrl, email: email_cliente, nombre: nombre_cliente, telefono: telefono_cliente,
  });
  res.status(201).json({ ok: true, checkout_url, referencia, monto, total: totalPrecio, tipo_pago });
});

// Crea la cita real a partir de una reserva pagada (idempotente)
async function crearCitaDesdeReserva(reserva, transactionId, amountInCents) {
  const datos = JSON.parse(reserva.datos);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { detalles, totalDur } = await resolverServicios({ servicios: datos.servicios }, conn);
    const hora_fin = sumarMinutos(datos.hora_inicio, totalDur);
    const id_cliente = await upsertCliente(
      { documento: datos.documento_cliente, nombre: datos.nombre_cliente, telefono: datos.telefono_cliente, email: datos.email_cliente }, conn
    );
    const pagado = amountInCents != null ? amountInCents / 100 : Number(reserva.monto);
    const estadoPago = reserva.tipo_pago === 'TOTAL' ? 'PAGADO' : 'ABONADO';

    const [r] = await conn.query(`
      INSERT INTO citas
        (id_cliente, documento_cliente, nombre_cliente, telefono_cliente, id_servicio, id_empleado, fecha, hora_inicio, hora_fin,
         estado, comentarios_cliente, precio_estimado, creado_por,
         monto_total, monto_pagado, tipo_pago, estado_pago, referencia_pago, transaccion_id)
      VALUES (?,?,?,?,?,?,?,?,?, 'PENDIENTE', ?, ?, 'CLIENTE', ?, ?, ?, ?, ?, ?)
    `, [id_cliente, datos.documento_cliente || null, datos.nombre_cliente, datos.telefono_cliente,
        detalles[0]?.id_servicio || null, datos.id_empleado || null, datos.fecha, datos.hora_inicio, hora_fin,
        datos.comentarios_cliente || null, Number(reserva.monto_total), Number(reserva.monto_total), pagado,
        reserva.tipo_pago, estadoPago, reserva.referencia, transactionId || null]);
    await guardarCitaServicios(conn, r.insertId, detalles);
    await conn.query('UPDATE reservas_pendientes SET estado = "PAGADA", transaccion_id = ?, id_cita = ? WHERE id = ?',
      [transactionId || null, r.insertId, reserva.id]);
    await conn.commit();

    // Confirmación por WhatsApp con info del pago
    const [info] = await pool.query(`
      SELECT u.nombre AS profesional,
             (SELECT GROUP_CONCAT(sv.nombre SEPARATOR ' + ') FROM cita_servicios cs JOIN servicios sv ON sv.id_servicio = cs.id_servicio WHERE cs.id_cita = ?) AS servicios
      FROM citas c LEFT JOIN usuarios u ON u.id_usuario = c.id_empleado WHERE c.id_cita = ?
    `, [r.insertId, r.insertId]);
    const saldo = Math.max(0, Number(reserva.monto_total) - pagado);
    enviarWhatsapp(datos.telefono_cliente, msgConfirmacionPago({
      nombre: datos.nombre_cliente, fecha: datos.fecha, hora: datos.hora_inicio,
      servicios: info[0]?.servicios, profesional: info[0]?.profesional,
      tipo_pago: reserva.tipo_pago, monto_pagado: pagado, saldo,
    })).then((ok) => { if (ok) pool.query('UPDATE citas SET confirmacion_enviada = 1 WHERE id_cita = ?', [r.insertId]); });

    return r.insertId;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

// Aplica el resultado de una transacción (idempotente)
async function aplicar({ referencia, transactionId, status, amountInCents }) {
  const [rows] = await pool.query('SELECT * FROM reservas_pendientes WHERE referencia = ? LIMIT 1', [referencia]);
  const reserva = rows[0];
  if (!reserva) return;
  if (reserva.estado === 'PAGADA') return; // ya creada
  if (status === 'APPROVED') {
    await crearCitaDesdeReserva(reserva, transactionId, amountInCents);
  } else if (['DECLINED', 'ERROR', 'VOIDED'].includes(status)) {
    await pool.query('UPDATE reservas_pendientes SET estado = "FALLIDA", transaccion_id = ? WHERE id = ?', [transactionId || null, reserva.id]);
  }
}

// Mapea la reserva a un resumen de pago para el frontend
function resumen(reserva) {
  if (!reserva) return { estado_pago: 'PENDIENTE', monto_total: 0, monto_pagado: 0, saldo: 0 };
  const estado_pago = reserva.estado === 'PAGADA'
    ? (reserva.tipo_pago === 'TOTAL' ? 'PAGADO' : 'ABONADO')
    : reserva.estado === 'FALLIDA' ? 'FALLIDO' : 'PENDIENTE';
  const pagado = reserva.estado === 'PAGADA' ? Number(reserva.monto) : 0;
  return {
    estado_pago, tipo_pago: reserva.tipo_pago,
    monto_total: Number(reserva.monto_total), monto_pagado: pagado,
    saldo: Math.max(0, Number(reserva.monto_total) - pagado),
  };
}

// POST /api/pagos/confirmar - el navegador vuelve de Wompi con el id de la transacción
export const confirmar = asyncHandler(async (req, res) => {
  const { id } = req.body;
  if (!id) throw new ApiError(400, 'Falta el id de la transacción.');
  const tx = await consultarTransaccion(id);
  await aplicar({ referencia: tx.reference, transactionId: tx.id, status: tx.status, amountInCents: tx.amount_in_cents });
  const [rows] = await pool.query('SELECT * FROM reservas_pendientes WHERE referencia = ? LIMIT 1', [tx.reference]);
  res.json({ ok: true, ...resumen(rows[0]) });
});

// GET /api/pagos/retorno - aquí vuelve Wompi (?id=...). Confirma y reenvía al frontend.
export const retorno = asyncHandler(async (req, res) => {
  const id = req.query.id;
  let ref = '';
  try {
    if (id) {
      const tx = await consultarTransaccion(id);
      ref = tx.reference || '';
      await aplicar({ referencia: tx.reference, transactionId: tx.id, status: tx.status, amountInCents: tx.amount_in_cents });
    }
  } catch { /* el frontend mostrará el estado igual */ }
  const front = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
  res.redirect(`${front}/pago?ref=${encodeURIComponent(ref)}`);
});

// GET /api/pagos/estado?ref=
export const estado = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM reservas_pendientes WHERE referencia = ? LIMIT 1', [req.query.ref]);
  if (!rows[0]) throw new ApiError(404, 'Pago no encontrado.');
  res.json({ ok: true, ...resumen(rows[0]) });
});

// POST /api/pagos/webhook - eventos de Wompi (producción)
export const webhook = asyncHandler(async (req, res) => {
  if (!validarEvento(req.body)) return res.status(401).json({ ok: false });
  const tx = req.body?.data?.transaction;
  if (tx) await aplicar({ referencia: tx.reference, transactionId: tx.id, status: tx.status, amountInCents: tx.amount_in_cents });
  res.json({ ok: true });
});
