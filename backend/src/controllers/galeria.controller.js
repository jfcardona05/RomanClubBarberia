import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

// GET /api/galeria/public - activas, destacadas primero
export const listarPublic = asyncHandler(async (req, res) => {
  const { categoria } = req.query;
  const where = ['activa = 1'];
  const params = [];
  if (categoria) { where.push('categoria = ?'); params.push(categoria); }
  const [rows] = await pool.query(`
    SELECT id_imagen, titulo, descripcion, imagen_url, categoria, destacada, orden
    FROM galeria WHERE ${where.join(' AND ')}
    ORDER BY destacada DESC, orden ASC, fecha_creacion DESC
  `, params);
  res.json({ ok: true, data: rows });
});

// GET /api/galeria - todas (panel)
export const listar = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM galeria ORDER BY orden ASC, fecha_creacion DESC');
  res.json({ ok: true, data: rows });
});

// POST /api/galeria  (ADMIN) - sube imagen
export const crear = asyncHandler(async (req, res) => {
  const { titulo, descripcion, categoria = 'OTRO', destacada = 0, orden = 0, activa = 1 } = req.body;
  const imagen_url = req.file ? `/uploads/gallery/${req.file.filename}` : req.body.imagen_url;
  if (!imagen_url) throw new ApiError(400, 'Debes subir una imagen.');

  const [r] = await pool.query(`
    INSERT INTO galeria (titulo, descripcion, imagen_url, categoria, destacada, orden, activa)
    VALUES (?,?,?,?,?,?,?)
  `, [titulo || null, descripcion || null, imagen_url, categoria,
      destacada ? 1 : 0, orden, activa ? 1 : 0]);
  res.status(201).json({ ok: true, id: r.insertId, message: 'Imagen agregada.' });
});

// PUT /api/galeria/:id  (ADMIN)
export const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [exist] = await pool.query('SELECT imagen_url FROM galeria WHERE id_imagen = ?', [id]);
  if (!exist[0]) throw new ApiError(404, 'Imagen no encontrada.');

  const imagen_url = req.file ? `/uploads/gallery/${req.file.filename}`
    : (req.body.imagen_url ?? exist[0].imagen_url);
  const { titulo, descripcion, categoria, destacada, orden, activa } = req.body;

  await pool.query(`
    UPDATE galeria SET
      titulo = ?, descripcion = ?, imagen_url = ?,
      categoria = COALESCE(?, categoria),
      destacada = COALESCE(?, destacada),
      orden = COALESCE(?, orden),
      activa = COALESCE(?, activa)
    WHERE id_imagen = ?
  `, [titulo ?? null, descripcion ?? null, imagen_url, categoria ?? null,
      destacada === undefined ? null : (destacada ? 1 : 0),
      orden ?? null,
      activa === undefined ? null : (activa ? 1 : 0), id]);
  res.json({ ok: true, message: 'Imagen actualizada.' });
});

// DELETE /api/galeria/:id  (ADMIN)
export const eliminar = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM galeria WHERE id_imagen = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Imagen no encontrada.');
  res.json({ ok: true, message: 'Imagen eliminada.' });
});
