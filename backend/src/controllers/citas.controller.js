import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';
import { upsertCliente } from './clientes.controller.js';
import { enviarWhatsapp } from '../services/whatsapp.service.js';
import { msgConfirmacion } from '../services/mensajes.js';

// Suma minutos a una hora "HH:MM:SS" y devuelve "HH:MM:SS"
export function sumarMinutos(hora, minutos) {
  const [h, m, s = 0] = hora.split(':').map(Number);
  const total = h * 60 + m + Number(minutos);
  const hh = String(Math.floor(total / 60) % 24).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// Verifica si un profesional ya tiene una cita activa que se solape en el horario.
// Solo cuentan PENDIENTE/CONFIRMADA/REAGENDADA; CANCELADA/COMPLETADA no bloquean.
export async function hayChoque({ id_empleado, fecha, hora_inicio, hora_fin, excluirId = null }) {
  if (!id_empleado) return false;
  const [rows] = await pool.query(`
    SELECT id_cita FROM citas
    WHERE id_empleado = ? AND fecha = ?
      AND estado = 'PENDIENTE'
      AND (? IS NULL OR id_cita <> ?)
      AND hora_inicio < ? AND COALESCE(hora_fin, hora_inicio) > ?
  `, [id_empleado, fecha, excluirId, excluirId, hora_fin, hora_inicio]);
  return rows.length > 0;
}

// Normaliza la lista de servicios de una cita y calcula duración/precio totales.
// Acepta `servicios` (array de ids) o, por compatibilidad, un único `id_servicio`.
export async function resolverServicios({ servicios, id_servicio }, conn = pool) {
  let ids = [];
  if (Array.isArray(servicios) && servicios.length) ids = servicios.map(Number).filter(Boolean);
  else if (id_servicio) ids = [Number(id_servicio)];
  if (!ids.length) return { ids: [], detalles: [], totalDur: 30, totalPrecio: null };

  const [rows] = await conn.query(
    `SELECT id_servicio, nombre, precio, duracion_minutos FROM servicios WHERE id_servicio IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const map = new Map(rows.map((r) => [r.id_servicio, r]));
  const detalles = ids.map((id) => map.get(id)).filter(Boolean);
  const totalDur = detalles.reduce((a, b) => a + (b.duracion_minutos || 0), 0) || 30;
  const totalPrecio = detalles.reduce((a, b) => a + Number(b.precio || 0), 0);
  return { ids: detalles.map((d) => d.id_servicio), detalles, totalDur, totalPrecio };
}

// Envía la confirmación por WhatsApp incluyendo el profesional. Si se envía con
// éxito marca la cita; si WhatsApp está caído, queda pendiente y el scheduler la reintenta.
async function enviarConfirmacion({ id_cita, telefono_cliente, nombre_cliente, fecha, hora_inicio, id_empleado, detalles }) {
  try {
    let profesional = null;
    if (id_empleado) {
      const [u] = await pool.query('SELECT nombre FROM usuarios WHERE id_usuario = ?', [id_empleado]);
      profesional = u[0]?.nombre || null;
    }
    const ok = await enviarWhatsapp(telefono_cliente, msgConfirmacion({
      nombre: nombre_cliente, fecha, hora: hora_inicio,
      servicios: detalles.map((d) => d.nombre).join(' + '), profesional,
    }));
    if (ok) await pool.query('UPDATE citas SET confirmacion_enviada = 1 WHERE id_cita = ?', [id_cita]);
  } catch { /* no romper el flujo de la cita */ }
}

// Si la cita se agenda muy cerca de la hora, omite recordatorios redundantes
// (ya recibió la confirmación). Devuelve las banderas a marcar como "enviado".
function flagsRecordatorioCercano(fecha, hora_inicio) {
  try {
    const objetivo = new Date(`${String(fecha).slice(0, 10)}T${String(hora_inicio).slice(0, 5)}:00`);
    const minutos = (objetivo.getTime() - Date.now()) / 60000;
    return { rec1h: minutos <= 70 ? 1 : 0, rec20m: minutos <= 25 ? 1 : 0 };
  } catch {
    return { rec1h: 0, rec20m: 0 };
  }
}

// Inserta las filas en cita_servicios para una cita
export async function guardarCitaServicios(conn, id_cita, detalles) {
  if (!detalles.length) return;
  const values = detalles.map((d) => [id_cita, d.id_servicio, d.precio, d.duracion_minutos]);
  await conn.query('INSERT INTO cita_servicios (id_cita, id_servicio, precio, duracion_minutos) VALUES ?', [values]);
}

// La lista incluye los servicios concatenados (varios por cita)
const SELECT_CITA = `
  SELECT c.*, s.nombre AS servicio_nombre, s.categoria AS servicio_categoria,
         u.nombre AS empleado_nombre,
         (SELECT GROUP_CONCAT(sv.nombre SEPARATOR ' + ')
            FROM cita_servicios cs JOIN servicios sv ON sv.id_servicio = cs.id_servicio
           WHERE cs.id_cita = c.id_cita) AS servicios_nombres
  FROM citas c
  LEFT JOIN servicios s ON s.id_servicio = c.id_servicio
  LEFT JOIN usuarios u ON u.id_usuario = c.id_empleado
`;

// GET /api/citas/disponibilidad?id_empleado=&fecha=&desde=&hasta=
// Público: devuelve los rangos ocupados (citas activas) para calcular slots libres.
export const disponibilidad = asyncHandler(async (req, res) => {
  const { id_empleado, fecha, desde, hasta } = req.query;
  const where = ["estado = 'PENDIENTE'"];
  const params = [];
  if (id_empleado) { where.push('id_empleado = ?'); params.push(id_empleado); }
  if (fecha) { where.push('fecha = ?'); params.push(fecha); }
  if (desde) { where.push('fecha >= ?'); params.push(desde); }
  if (hasta) { where.push('fecha <= ?'); params.push(hasta); }

  const [rows] = await pool.query(
    `SELECT fecha, hora_inicio, hora_fin FROM citas WHERE ${where.join(' AND ')} ORDER BY fecha, hora_inicio`,
    params
  );
  res.json({ ok: true, data: rows });
});

// POST /api/citas/public - cliente sin login. La reserva queda CONFIRMADA automáticamente.
export const crearPublic = asyncHandler(async (req, res) => {
  const { nombre_cliente, telefono_cliente, documento_cliente, email_cliente,
          servicios, id_servicio, id_empleado, fecha, hora_inicio, comentarios_cliente } = req.body;
  if (!nombre_cliente || !telefono_cliente || !fecha || !hora_inicio) {
    throw new ApiError(400, 'Nombre, teléfono, fecha y hora son obligatorios.');
  }

  const { detalles, totalDur, totalPrecio } = await resolverServicios({ servicios, id_servicio });
  const hora_fin = sumarMinutos(hora_inicio, totalDur);

  // Si eligió profesional, evita que tomen un horario ya ocupado
  if (id_empleado && await hayChoque({ id_empleado, fecha, hora_inicio, hora_fin })) {
    throw new ApiError(409, 'Ese horario acaba de ser tomado. Por favor elige otro.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id_cliente = await upsertCliente(
      { documento: documento_cliente, nombre: nombre_cliente, telefono: telefono_cliente, email: email_cliente },
      conn
    );
    const [r] = await conn.query(`
      INSERT INTO citas
        (id_cliente, documento_cliente, nombre_cliente, telefono_cliente, id_servicio, id_empleado, fecha, hora_inicio, hora_fin,
         estado, comentarios_cliente, precio_estimado, creado_por)
      VALUES (?,?,?,?,?,?,?,?,?, 'PENDIENTE', ?, ?, 'CLIENTE')
    `, [id_cliente, documento_cliente || null, nombre_cliente, telefono_cliente, detalles[0]?.id_servicio || null,
        id_empleado || null, fecha, hora_inicio, hora_fin, comentarios_cliente || null, totalPrecio]);
    await guardarCitaServicios(conn, r.insertId, detalles);
    // Omite recordatorios si la cita es muy próxima (evita mensajes seguidos)
    const fl = flagsRecordatorioCercano(fecha, hora_inicio);
    if (fl.rec1h || fl.rec20m) {
      await conn.query('UPDATE citas SET recordatorio_1h_enviado = ?, recordatorio_20m_enviado = ? WHERE id_cita = ?',
        [fl.rec1h, fl.rec20m, r.insertId]);
    }
    await conn.commit();
    // Mensaje de confirmación por WhatsApp (no bloquea la respuesta)
    enviarConfirmacion({ id_cita: r.insertId, telefono_cliente, nombre_cliente, fecha, hora_inicio, id_empleado, detalles });
    res.status(201).json({ ok: true, id: r.insertId, message: '¡Tu solicitud de cita fue enviada! Te confirmaremos pronto.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// GET /api/citas - ADMIN ve todas; EMPLEADO solo las suyas. Filtros opcionales.
export const listar = asyncHandler(async (req, res) => {
  const { estado, fecha, desde, hasta } = req.query;
  const where = [];
  const params = [];

  if (req.user.rol === 'EMPLEADO') { where.push('c.id_empleado = ?'); params.push(req.user.id); }
  if (estado) { where.push('c.estado = ?'); params.push(estado); }
  if (fecha) { where.push('c.fecha = ?'); params.push(fecha); }
  if (desde) { where.push('c.fecha >= ?'); params.push(desde); }
  if (hasta) { where.push('c.fecha <= ?'); params.push(hasta); }

  const sql = `${SELECT_CITA} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
               ORDER BY c.fecha ASC, c.hora_inicio ASC`;
  const [rows] = await pool.query(sql, params);
  res.json({ ok: true, data: rows });
});

// GET /api/citas/:id
export const obtener = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`${SELECT_CITA} WHERE c.id_cita = ?`, [req.params.id]);
  const cita = rows[0];
  if (!cita) throw new ApiError(404, 'Cita no encontrada.');
  if (req.user.rol === 'EMPLEADO' && cita.id_empleado !== req.user.id) {
    throw new ApiError(403, 'No puedes ver esta cita.');
  }
  const [servs] = await pool.query('SELECT id_servicio FROM cita_servicios WHERE id_cita = ?', [cita.id_cita]);
  cita.servicios = servs.map((s) => s.id_servicio);
  res.json({ ok: true, data: cita });
});

// POST /api/citas - creación manual desde el panel
export const crear = asyncHandler(async (req, res) => {
  const {
    nombre_cliente, telefono_cliente, documento_cliente, email_cliente, servicios, id_servicio, id_empleado,
    fecha, hora_inicio, estado = 'PENDIENTE', comentarios_cliente,
    observaciones_internas, precio_estimado,
  } = req.body;
  if (!nombre_cliente || !telefono_cliente || !fecha || !hora_inicio) {
    throw new ApiError(400, 'Nombre, teléfono, fecha y hora son obligatorios.');
  }

  const { detalles, totalDur, totalPrecio } = await resolverServicios({ servicios, id_servicio });
  const hora_fin = sumarMinutos(hora_inicio, totalDur);

  if (await hayChoque({ id_empleado, fecha, hora_inicio, hora_fin })) {
    throw new ApiError(409, 'El profesional ya tiene una cita en ese horario.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id_cliente = await upsertCliente(
      { documento: documento_cliente, nombre: nombre_cliente, telefono: telefono_cliente, email: email_cliente },
      conn
    );
    const [r] = await conn.query(`
      INSERT INTO citas
        (id_cliente, documento_cliente, nombre_cliente, telefono_cliente, id_servicio, id_empleado, fecha, hora_inicio, hora_fin,
         estado, comentarios_cliente, observaciones_internas, precio_estimado, creado_por)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [id_cliente, documento_cliente || null, nombre_cliente, telefono_cliente, detalles[0]?.id_servicio || null, id_empleado || null,
        fecha, hora_inicio, hora_fin, estado, comentarios_cliente || null, observaciones_internas || null,
        precio_estimado ?? totalPrecio, req.user.rol]);
    await guardarCitaServicios(conn, r.insertId, detalles);
    const fl = flagsRecordatorioCercano(fecha, hora_inicio);
    if (fl.rec1h || fl.rec20m) {
      await conn.query('UPDATE citas SET recordatorio_1h_enviado = ?, recordatorio_20m_enviado = ? WHERE id_cita = ?',
        [fl.rec1h, fl.rec20m, r.insertId]);
    }
    await conn.commit();
    enviarConfirmacion({ id_cita: r.insertId, telefono_cliente, nombre_cliente, fecha, hora_inicio, id_empleado, detalles });
    res.status(201).json({ ok: true, id: r.insertId, message: 'Cita creada.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// PUT /api/citas/:id - edición general (ADMIN)
export const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [exist] = await pool.query('SELECT * FROM citas WHERE id_cita = ?', [id]);
  const actual = exist[0];
  if (!actual) throw new ApiError(404, 'Cita no encontrada.');

  const b = req.body;
  const fecha = b.fecha ?? actual.fecha;
  const hora_inicio = b.hora_inicio ?? actual.hora_inicio;
  const id_empleado = b.id_empleado !== undefined ? b.id_empleado : actual.id_empleado;

  // ¿Cambian los servicios? (array nuevo o id_servicio suelto)
  const cambiaServicios = b.servicios !== undefined || b.id_servicio !== undefined;
  let nuevaInfo = null;
  if (cambiaServicios) {
    nuevaInfo = await resolverServicios({ servicios: b.servicios, id_servicio: b.id_servicio });
  }
  const hora_fin = (b.hora_inicio || cambiaServicios)
    ? sumarMinutos(hora_inicio, nuevaInfo ? nuevaInfo.totalDur : await duracionActual(id))
    : actual.hora_fin;

  if (await hayChoque({ id_empleado, fecha, hora_inicio, hora_fin, excluirId: id })) {
    throw new ApiError(409, 'El profesional ya tiene una cita en ese horario.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const id_servicio_primario = nuevaInfo ? (nuevaInfo.detalles[0]?.id_servicio || null) : actual.id_servicio;
    const precio_estimado = b.precio_estimado ?? (nuevaInfo ? nuevaInfo.totalPrecio : actual.precio_estimado);

    await conn.query(`
      UPDATE citas SET
        nombre_cliente = COALESCE(?, nombre_cliente),
        telefono_cliente = COALESCE(?, telefono_cliente),
        documento_cliente = COALESCE(?, documento_cliente),
        id_servicio = ?, id_empleado = ?, fecha = ?, hora_inicio = ?, hora_fin = ?,
        estado = COALESCE(?, estado),
        comentarios_cliente = COALESCE(?, comentarios_cliente),
        observaciones_internas = COALESCE(?, observaciones_internas),
        precio_estimado = ?
      WHERE id_cita = ?
    `, [b.nombre_cliente ?? null, b.telefono_cliente ?? null, b.documento_cliente ?? null,
        id_servicio_primario, id_empleado, fecha, hora_inicio, hora_fin, b.estado ?? null,
        b.comentarios_cliente ?? null, b.observaciones_internas ?? null, precio_estimado, id]);

    if (nuevaInfo) {
      await conn.query('DELETE FROM cita_servicios WHERE id_cita = ?', [id]);
      await guardarCitaServicios(conn, id, nuevaInfo.detalles);
    }
    await conn.commit();
    res.json({ ok: true, message: 'Cita actualizada.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// Suma de duración de los servicios actuales de una cita (fallback al reagendar/editar)
async function duracionActual(id_cita) {
  const [rows] = await pool.query('SELECT COALESCE(SUM(duracion_minutos),30) AS dur FROM cita_servicios WHERE id_cita = ?', [id_cita]);
  return rows[0]?.dur || 30;
}

// Helper para cambios de estado simples
async function setEstado(id, estado) {
  const [r] = await pool.query('UPDATE citas SET estado = ? WHERE id_cita = ?', [estado, id]);
  if (!r.affectedRows) throw new ApiError(404, 'Cita no encontrada.');
}

// PUT /api/citas/:id/confirmar (ADMIN) - opcional asigna profesional
export const confirmar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id_empleado } = req.body;
  const [exist] = await pool.query('SELECT * FROM citas WHERE id_cita = ?', [id]);
  const c = exist[0];
  if (!c) throw new ApiError(404, 'Cita no encontrada.');

  const emp = id_empleado ?? c.id_empleado;
  if (await hayChoque({ id_empleado: emp, fecha: c.fecha, hora_inicio: c.hora_inicio, hora_fin: c.hora_fin, excluirId: id })) {
    throw new ApiError(409, 'El profesional ya tiene una cita confirmada en ese horario.');
  }
  await pool.query('UPDATE citas SET estado = "CONFIRMADA", id_empleado = ? WHERE id_cita = ?', [emp || null, id]);
  res.json({ ok: true, message: 'Cita confirmada.' });
});

// PUT /api/citas/:id/cancelar (ADMIN)
export const cancelar = asyncHandler(async (req, res) => {
  if (req.body.observaciones_internas) {
    await pool.query('UPDATE citas SET observaciones_internas = ? WHERE id_cita = ?',
      [req.body.observaciones_internas, req.params.id]);
  }
  await setEstado(req.params.id, 'CANCELADA');
  res.json({ ok: true, message: 'Cita cancelada.' });
});

// PUT /api/citas/:id/reagendar (ADMIN)
export const reagendar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fecha, hora_inicio, id_empleado } = req.body;
  if (!fecha || !hora_inicio) throw new ApiError(400, 'Nueva fecha y hora son obligatorias.');

  const [exist] = await pool.query('SELECT * FROM citas WHERE id_cita = ?', [id]);
  const c = exist[0];
  if (!c) throw new ApiError(404, 'Cita no encontrada.');

  const emp = id_empleado ?? c.id_empleado;
  const hora_fin = sumarMinutos(hora_inicio, await duracionActual(id));
  if (await hayChoque({ id_empleado: emp, fecha, hora_inicio, hora_fin, excluirId: id })) {
    throw new ApiError(409, 'El profesional ya tiene una cita en ese horario.');
  }

  await pool.query(
    'UPDATE citas SET fecha = ?, hora_inicio = ?, hora_fin = ?, id_empleado = ?, estado = "REAGENDADA" WHERE id_cita = ?',
    [fecha, hora_inicio, hora_fin, emp || null, id]
  );
  res.json({ ok: true, message: 'Cita reagendada.' });
});

// PUT /api/citas/:id/completar - registra servicio realizado e ingreso
export const completar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { precio_final, metodo_pago = 'EFECTIVO', observaciones } = req.body;

  const [exist] = await pool.query('SELECT * FROM citas WHERE id_cita = ?', [id]);
  const c = exist[0];
  if (!c) throw new ApiError(404, 'Cita no encontrada.');

  // Un EMPLEADO solo completa sus propias citas y si tiene permiso
  if (req.user.rol === 'EMPLEADO') {
    if (c.id_empleado !== req.user.id) throw new ApiError(403, 'No puedes completar esta cita.');
    const [perfil] = await pool.query('SELECT puede_completar_citas FROM empleados_perfiles WHERE id_usuario = ?', [req.user.id]);
    if (!perfil[0]?.puede_completar_citas) throw new ApiError(403, 'No tienes permiso para completar citas.');
  }

  // Precio cobrado: el que ingresa quien completa, o el estimado de la cita
  const precio = precio_final ?? c.precio_final ?? c.precio_estimado ?? 0;
  const empleadoFinal = c.id_empleado ?? (req.user.rol === 'EMPLEADO' ? req.user.id : null);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      'UPDATE citas SET estado = "COMPLETADA", precio_final = ?, id_empleado = COALESCE(id_empleado, ?) WHERE id_cita = ?',
      [precio, empleadoFinal, id]
    );

    // Un registro de servicio_realizado por cada servicio de la cita,
    // repartiendo el precio cobrado total proporcionalmente a cada servicio.
    const [servs] = await conn.query('SELECT id_servicio, precio FROM cita_servicios WHERE id_cita = ?', [id]);
    if (servs.length) {
      const sumaPrecios = servs.reduce((a, s) => a + Number(s.precio || 0), 0);
      let acumulado = 0;
      for (let i = 0; i < servs.length; i++) {
        const s = servs[i];
        let parte;
        if (i === servs.length - 1) parte = precio - acumulado; // el último ajusta el redondeo
        else {
          parte = sumaPrecios > 0 ? Math.round(precio * (Number(s.precio) / sumaPrecios)) : Math.round(precio / servs.length);
          acumulado += parte;
        }
        await conn.query(`
          INSERT INTO servicios_realizados
            (id_cita, id_servicio, id_empleado, nombre_cliente, telefono_cliente, precio_cobrado, metodo_pago, observaciones)
          VALUES (?,?,?,?,?,?,?,?)
        `, [id, s.id_servicio, empleadoFinal, c.nombre_cliente, c.telefono_cliente, parte, metodo_pago, observaciones || null]);
      }
    } else {
      await conn.query(`
        INSERT INTO servicios_realizados
          (id_cita, id_servicio, id_empleado, nombre_cliente, telefono_cliente, precio_cobrado, metodo_pago, observaciones)
        VALUES (?,?,?,?,?,?,?,?)
      `, [id, c.id_servicio, empleadoFinal, c.nombre_cliente, c.telefono_cliente, precio, metodo_pago, observaciones || null]);
    }

    await conn.commit();
    res.json({ ok: true, message: 'Cita completada y registrada como servicio realizado.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// DELETE /api/citas/:id (ADMIN)
export const eliminar = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM citas WHERE id_cita = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Cita no encontrada.');
  res.json({ ok: true, message: 'Cita eliminada.' });
});
