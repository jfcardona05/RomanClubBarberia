import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/ApiError.js';

// GET /api/dashboard/resumen
// ADMIN: todo el negocio. EMPLEADO: solo sus números.
export const resumen = asyncHandler(async (req, res) => {
  const esEmpleado = req.user.rol === 'EMPLEADO';
  const idEmp = req.user.id;
  // filtro por empleado reutilizable
  const filtroCita = esEmpleado ? 'AND id_empleado = ?' : '';
  const filtroSr = esEmpleado ? 'AND id_empleado = ?' : '';
  const p = esEmpleado ? [idEmp] : [];

  // Conteo de citas de hoy por estado
  const [hoy] = await pool.query(`
    SELECT estado, COUNT(*) AS total
    FROM citas WHERE fecha = CURDATE() ${filtroCita}
    GROUP BY estado
  `, p);
  const citasHoy = { PENDIENTE: 0, COMPLETADA: 0, CANCELADA: 0 };
  hoy.forEach((r) => { if (r.estado in citasHoy) citasHoy[r.estado] = r.total; });
  // "Citas hoy" = solo las activas (agendadas + completadas), SIN contar las canceladas
  const totalHoy = citasHoy.PENDIENTE + citasHoy.COMPLETADA;

  // Ingresos del día y del mes (servicios_realizados)
  const [[ingresoDia]] = await pool.query(`
    SELECT COALESCE(SUM(precio_cobrado),0) AS total
    FROM servicios_realizados WHERE DATE(fecha_realizado) = CURDATE() ${filtroSr}
  `, p);
  const [[ingresoMes]] = await pool.query(`
    SELECT COALESCE(SUM(precio_cobrado),0) AS total
    FROM servicios_realizados
    WHERE YEAR(fecha_realizado) = YEAR(CURDATE()) AND MONTH(fecha_realizado) = MONTH(CURDATE()) ${filtroSr}
  `, p);

  // Servicios más vendidos (último mes)
  const [masVendidos] = await pool.query(`
    SELECT s.nombre, COUNT(*) AS cantidad, COALESCE(SUM(sr.precio_cobrado),0) AS ingresos
    FROM servicios_realizados sr
    LEFT JOIN servicios s ON s.id_servicio = sr.id_servicio
    WHERE sr.fecha_realizado >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ${filtroSr}
    GROUP BY sr.id_servicio, s.nombre
    ORDER BY cantidad DESC LIMIT 5
  `, p);

  // Próximas citas (confirmadas/pendientes futuras)
  const [proximas] = await pool.query(`
    SELECT c.id_cita, c.nombre_cliente, c.fecha, c.hora_inicio, c.estado,
           s.nombre AS servicio_nombre, u.nombre AS empleado_nombre
    FROM citas c
    LEFT JOIN servicios s ON s.id_servicio = c.id_servicio
    LEFT JOIN usuarios u ON u.id_usuario = c.id_empleado
    WHERE c.estado IN ('PENDIENTE','CONFIRMADA','REAGENDADA')
      AND (c.fecha > CURDATE() OR (c.fecha = CURDATE() AND c.hora_inicio >= CURTIME()))
      ${esEmpleado ? 'AND c.id_empleado = ?' : ''}
    ORDER BY c.fecha ASC, c.hora_inicio ASC LIMIT 8
  `, esEmpleado ? [idEmp] : []);

  // Alertas de inventario (solo ADMIN)
  let alertasInventario = [];
  let resumenEmpleados = [];
  if (!esEmpleado) {
    const [al] = await pool.query(`
      SELECT nombre, stock_actual, stock_minimo, unidad
      FROM inventario_productos
      WHERE activo = 1 AND stock_actual <= stock_minimo
      ORDER BY (stock_minimo - stock_actual) DESC LIMIT 10
    `);
    alertasInventario = al;

    const [re] = await pool.query(`
      SELECT u.id_usuario, u.nombre,
             COUNT(sr.id_servicio_realizado) AS servicios,
             COALESCE(SUM(sr.precio_cobrado),0) AS ingresos
      FROM usuarios u
      LEFT JOIN servicios_realizados sr ON sr.id_empleado = u.id_usuario
        AND YEAR(sr.fecha_realizado) = YEAR(CURDATE()) AND MONTH(sr.fecha_realizado) = MONTH(CURDATE())
      WHERE u.rol IN ('ADMIN','EMPLEADO') AND u.estado = 'ACTIVO'
      GROUP BY u.id_usuario, u.nombre
      ORDER BY ingresos DESC
    `);
    resumenEmpleados = re;
  }

  res.json({
    ok: true,
    data: {
      citasHoy: { ...citasHoy, total: totalHoy },
      ingresoDia: Number(ingresoDia.total),
      ingresoMes: Number(ingresoMes.total),
      masVendidos,
      proximas,
      alertasInventario,
      resumenEmpleados,
    },
  });
});

// GET /api/dashboard/reportes - HISTORIAL DE PAGOS unificado (local + Wompi)
// El EMPLEADO solo ve lo suyo (se fuerza su id_empleado).
export const reportes = asyncHandler(async (req, res) => {
  const esEmpleado = req.user.rol === 'EMPLEADO';
  const hasta = req.query.hasta || null;
  const desde = req.query.desde || null;
  const idEmpleado = esEmpleado ? req.user.id : (req.query.id_empleado || null);
  const idServicio = req.query.id_servicio || null;

  const SERVICIOS_SUB = `(SELECT GROUP_CONCAT(sv.nombre SEPARATOR ' + ')
      FROM cita_servicios cs JOIN servicios sv ON sv.id_servicio = cs.id_servicio
     WHERE cs.id_cita = c.id_cita)`;

  // UNA fila por cita (no separadas): muestra abono online + resto en local + método del resto.
  // Incluye citas completadas y/o con pago en línea. NUNCA canceladas.
  const w = [
    "c.estado <> 'CANCELADA'",
    "(c.estado = 'COMPLETADA' OR c.estado_pago IN ('ABONADO','PAGADO'))",
  ];
  const p = [];
  if (desde) { w.push('c.fecha >= ?'); p.push(desde); }
  if (hasta) { w.push('c.fecha <= ?'); p.push(hasta); }
  if (!desde && !hasta) w.push('c.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)');
  if (idEmpleado) { w.push('c.id_empleado = ?'); p.push(idEmpleado); }
  if (idServicio) { w.push('EXISTS (SELECT 1 FROM cita_servicios cz WHERE cz.id_cita = c.id_cita AND cz.id_servicio = ?)'); p.push(idServicio); }

  const [rows] = await pool.query(`
    SELECT c.id_cita AS id, c.nombre_cliente, c.fecha, c.hora_inicio, c.estado, c.tipo_pago, c.estado_pago,
           c.monto_pagado AS online, c.monto_total AS monto_total_cita,
           u.nombre AS profesional, ${SERVICIOS_SUB} AS servicio,
           sr.total_cobrado, sr.metodo AS metodo_local
    FROM citas c
    LEFT JOIN usuarios u ON u.id_usuario = c.id_empleado
    LEFT JOIN (
      SELECT id_cita, SUM(precio_cobrado) AS total_cobrado,
             SUBSTRING_INDEX(GROUP_CONCAT(metodo_pago ORDER BY id_servicio_realizado), ',', 1) AS metodo
      FROM servicios_realizados GROUP BY id_cita
    ) sr ON sr.id_cita = c.id_cita
    WHERE ${w.join(' AND ')}
    ORDER BY c.fecha DESC, c.hora_inicio DESC
    LIMIT 200
  `, p);

  const historialPagos = rows.map((r) => {
    const completada = r.estado === 'COMPLETADA';
    const total = Number(completada ? (r.total_cobrado ?? r.monto_total_cita) : r.monto_total_cita) || 0;
    const online = Number(r.online || 0);                       // pagado por Wompi (abono o total)
    const local = completada ? Math.max(0, total - online) : 0; // resto cobrado en el local
    const pendiente = completada ? 0 : Math.max(0, total - online); // saldo aún sin cobrar
    return {
      id: r.id, fecha: r.fecha, hora_inicio: r.hora_inicio, nombre_cliente: r.nombre_cliente,
      servicio: r.servicio, profesional: r.profesional, tipo_pago: r.tipo_pago, estado_pago: r.estado_pago, estado: r.estado,
      total, online, local, pendiente,
      metodo_local: local > 0 ? r.metodo_local : null,
      recibido: online + local,
    };
  });

  const total = historialPagos.reduce((a, r) => a + r.recibido, 0);
  const totalOnline = historialPagos.reduce((a, r) => a + r.online, 0);
  const totalLocal = historialPagos.reduce((a, r) => a + r.local, 0);
  const totalPendiente = historialPagos.reduce((a, r) => a + r.pendiente, 0);

  res.json({ ok: true, data: { historialPagos, total, totalOnline, totalLocal, totalPendiente } });
});
