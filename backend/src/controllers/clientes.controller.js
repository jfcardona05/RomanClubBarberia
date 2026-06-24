import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

// Inserta o actualiza un cliente por su documento. Devuelve el id_cliente.
// Reutilizable desde citas (reserva pública o manual). Acepta una conexión (transacción).
export async function upsertCliente({ documento, nombre, telefono, email }, conn = pool) {
  if (!documento) return null;
  const [r] = await conn.query(`
    INSERT INTO clientes (documento, nombre, telefono, email)
    VALUES (?,?,?,?)
    ON DUPLICATE KEY UPDATE
      nombre = VALUES(nombre),
      telefono = COALESCE(VALUES(telefono), telefono),
      email = COALESCE(VALUES(email), email)
  `, [documento, nombre || 'Sin nombre', telefono || null, email || null]);
  if (r.insertId) return r.insertId;
  const [row] = await conn.query('SELECT id_cliente FROM clientes WHERE documento = ?', [documento]);
  return row[0]?.id_cliente || null;
}

// GET /api/clientes  (panel) - lista con conteo de citas y última visita
export const listar = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const where = [];
  const params = [];
  if (q) {
    where.push('(c.documento LIKE ? OR c.nombre LIKE ? OR c.telefono LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const [rows] = await pool.query(`
    SELECT c.*,
           COUNT(ci.id_cita) AS total_citas,
           MAX(ci.fecha) AS ultima_visita
    FROM clientes c
    LEFT JOIN citas ci ON ci.id_cliente = c.id_cliente
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    GROUP BY c.id_cliente
    ORDER BY c.nombre
  `, params);
  res.json({ ok: true, data: rows });
});

// GET /api/clientes/:id - detalle + historial de citas
export const obtener = asyncHandler(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM clientes WHERE id_cliente = ?', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Cliente no encontrado.');
  const [citas] = await pool.query(`
    SELECT ci.id_cita, ci.fecha, ci.hora_inicio, ci.estado, ci.precio_final, ci.precio_estimado,
           s.nombre AS servicio_nombre, u.nombre AS empleado_nombre
    FROM citas ci
    LEFT JOIN servicios s ON s.id_servicio = ci.id_servicio
    LEFT JOIN usuarios u ON u.id_usuario = ci.id_empleado
    WHERE ci.id_cliente = ?
    ORDER BY ci.fecha DESC, ci.hora_inicio DESC
  `, [req.params.id]);
  rows[0].historial = citas;
  res.json({ ok: true, data: rows[0] });
});

// GET /api/clientes/public/:documento - lookup público para autocompletar la reserva
export const buscarPublic = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT nombre, telefono FROM clientes WHERE documento = ? LIMIT 1',
    [req.params.documento]
  );
  if (!rows[0]) return res.json({ ok: true, existe: false });
  res.json({ ok: true, existe: true, cliente: rows[0] });
});

// POST /api/clientes  (ADMIN)
export const crear = asyncHandler(async (req, res) => {
  const { documento, nombre, telefono, email, notas } = req.body;
  if (!documento || !nombre) throw new ApiError(400, 'Documento y nombre son obligatorios.');
  const [r] = await pool.query(
    'INSERT INTO clientes (documento, nombre, telefono, email, notas) VALUES (?,?,?,?,?)',
    [documento, nombre, telefono || null, email || null, notas || null]
  );
  res.status(201).json({ ok: true, id: r.insertId, message: 'Cliente registrado.' });
});

// PUT /api/clientes/:id  (ADMIN)
export const actualizar = asyncHandler(async (req, res) => {
  const { documento, nombre, telefono, email, notas } = req.body;
  const [r] = await pool.query(`
    UPDATE clientes SET
      documento = COALESCE(?, documento),
      nombre = COALESCE(?, nombre),
      telefono = ?, email = ?, notas = ?
    WHERE id_cliente = ?
  `, [documento ?? null, nombre ?? null, telefono ?? null, email ?? null, notas ?? null, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Cliente no encontrado.');
  res.json({ ok: true, message: 'Cliente actualizado.' });
});

// DELETE /api/clientes/:id  (ADMIN)
export const eliminar = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM clientes WHERE id_cliente = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Cliente no encontrado.');
  res.json({ ok: true, message: 'Cliente eliminado.' });
});
