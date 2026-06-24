import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

// GET /api/servicios/public - solo activos, para la landing (incluye profesionales)
export const listarPublic = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT id_servicio, nombre, descripcion, categoria, precio, duracion_minutos, imagen_url
    FROM servicios WHERE activo = 1
    ORDER BY categoria, precio
  `);
  const [asign] = await pool.query(`
    SELECT es.id_servicio, u.id_usuario, u.nombre, p.hora_apertura, p.hora_cierre
    FROM empleado_servicios es
    JOIN usuarios u ON u.id_usuario = es.id_usuario
    LEFT JOIN empleados_perfiles p ON p.id_usuario = u.id_usuario
    WHERE u.estado = 'ACTIVO'
  `);
  const map = {};
  asign.forEach((a) => {
    (map[a.id_servicio] ||= []).push({
      id_usuario: a.id_usuario, nombre: a.nombre,
      hora_apertura: a.hora_apertura, hora_cierre: a.hora_cierre,
    });
  });
  rows.forEach((s) => { s.profesionales = map[s.id_servicio] || []; });
  res.json({ ok: true, data: rows });
});

// GET /api/servicios - todos (panel). Incluye profesionales asignados.
export const listar = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM servicios ORDER BY categoria, nombre');
  const [asign] = await pool.query(`
    SELECT es.id_servicio, u.id_usuario, u.nombre
    FROM empleado_servicios es JOIN usuarios u ON u.id_usuario = es.id_usuario
  `);
  const map = {};
  asign.forEach((a) => {
    (map[a.id_servicio] ||= []).push({ id_usuario: a.id_usuario, nombre: a.nombre });
  });
  rows.forEach((s) => { s.profesionales = map[s.id_servicio] || []; });
  res.json({ ok: true, data: rows });
});

// POST /api/servicios  (ADMIN)
export const crear = asyncHandler(async (req, res) => {
  const { nombre, descripcion, categoria = 'BARBERIA', precio = 0, duracion_minutos = 30, activo = 1 } = req.body;
  if (!nombre) throw new ApiError(400, 'El nombre del servicio es obligatorio.');

  const imagen_url = req.file ? `/uploads/services/${req.file.filename}` : (req.body.imagen_url || null);

  const [r] = await pool.query(
    'INSERT INTO servicios (nombre, descripcion, categoria, precio, duracion_minutos, imagen_url, activo) VALUES (?,?,?,?,?,?,?)',
    [nombre, descripcion || null, categoria, precio, duracion_minutos, imagen_url, activo ? 1 : 0]
  );
  res.status(201).json({ ok: true, id: r.insertId, message: 'Servicio creado.' });
});

// PUT /api/servicios/:id  (ADMIN)
export const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, categoria, precio, duracion_minutos, activo } = req.body;

  const [exist] = await pool.query('SELECT imagen_url FROM servicios WHERE id_servicio = ?', [id]);
  if (!exist[0]) throw new ApiError(404, 'Servicio no encontrado.');

  const imagen_url = req.file
    ? `/uploads/services/${req.file.filename}`
    : (req.body.imagen_url !== undefined ? req.body.imagen_url : exist[0].imagen_url);

  await pool.query(`
    UPDATE servicios SET
      nombre = COALESCE(?, nombre),
      descripcion = ?,
      categoria = COALESCE(?, categoria),
      precio = COALESCE(?, precio),
      duracion_minutos = COALESCE(?, duracion_minutos),
      imagen_url = ?,
      activo = COALESCE(?, activo)
    WHERE id_servicio = ?
  `, [
    nombre ?? null, descripcion ?? null, categoria ?? null,
    precio ?? null, duracion_minutos ?? null, imagen_url,
    activo === undefined ? null : (activo ? 1 : 0), id,
  ]);

  res.json({ ok: true, message: 'Servicio actualizado.' });
});

// DELETE /api/servicios/:id  (ADMIN)
export const eliminar = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM servicios WHERE id_servicio = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Servicio no encontrado.');
  res.json({ ok: true, message: 'Servicio eliminado.' });
});
