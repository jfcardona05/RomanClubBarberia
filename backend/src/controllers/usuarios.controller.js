import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

// Normaliza un array que puede llegar como array, string suelto o JSON (multipart)
function normalizarServicios(servicios) {
  if (servicios === undefined) return undefined;
  let arr = servicios;
  if (typeof arr === 'string') {
    try { const j = JSON.parse(arr); arr = Array.isArray(j) ? j : [arr]; } catch { arr = arr ? [arr] : []; }
  }
  return (arr || []).map(Number).filter(Boolean);
}
const esVerdadero = (v) => v === 1 || v === '1' || v === true || v === 'true';

// GET /api/usuarios/public/equipo - datos no sensibles para la web
export const equipoPublic = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.rol, p.especialidad, p.bio, p.foto_url
    FROM usuarios u
    LEFT JOIN empleados_perfiles p ON p.id_usuario = u.id_usuario
    WHERE u.estado = 'ACTIVO'
    ORDER BY (u.rol = 'ADMIN') DESC, u.nombre
  `);
  res.json({ ok: true, data: rows });
});

// GET /api/usuarios  (ADMIN) - lista empleados/usuarios con su perfil
export const listar = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.rol, u.estado, u.fecha_creacion,
           p.especialidad, p.bio, p.foto_url, p.hora_apertura, p.hora_cierre, p.puede_completar_citas
    FROM usuarios u
    LEFT JOIN empleados_perfiles p ON p.id_usuario = u.id_usuario
    ORDER BY u.fecha_creacion DESC
  `);
  res.json({ ok: true, data: rows });
});

// GET /api/usuarios/:id
export const obtener = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.rol, u.estado,
           p.especialidad, p.bio, p.foto_url, p.hora_apertura, p.hora_cierre, p.puede_completar_citas
    FROM usuarios u
    LEFT JOIN empleados_perfiles p ON p.id_usuario = u.id_usuario
    WHERE u.id_usuario = ? LIMIT 1
  `, [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado.');

  // Servicios asignados
  const [servicios] = await pool.query(
    'SELECT id_servicio FROM empleado_servicios WHERE id_usuario = ?',
    [req.params.id]
  );
  rows[0].servicios = servicios.map((s) => s.id_servicio);

  res.json({ ok: true, data: rows[0] });
});

// POST /api/usuarios  (ADMIN) - crear empleado que puede iniciar sesión
export const crear = asyncHandler(async (req, res) => {
  const {
    nombre, email, password, telefono,
    rol = 'EMPLEADO', especialidad = 'OTRO', bio = null,
    hora_apertura = '09:00', hora_cierre = '20:00',
    puede_completar_citas = 1,
  } = req.body;
  const servicios = normalizarServicios(req.body.servicios) || [];
  const foto_url = req.file ? `/uploads/team/${req.file.filename}` : null;

  if (!nombre || !email || !password) {
    throw new ApiError(400, 'Nombre, email y contraseña son obligatorios.');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.');
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const hash = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      'INSERT INTO usuarios (nombre, email, password_hash, telefono, rol) VALUES (?,?,?,?,?)',
      [nombre, email, hash, telefono || null, rol]
    );
    const id = result.insertId;

    await conn.query(
      'INSERT INTO empleados_perfiles (id_usuario, especialidad, bio, foto_url, hora_apertura, hora_cierre, puede_completar_citas) VALUES (?,?,?,?,?,?,?)',
      [id, especialidad, bio, foto_url, hora_apertura, hora_cierre, esVerdadero(puede_completar_citas) ? 1 : 0]
    );

    if (servicios.length) {
      const values = servicios.map((sid) => [id, sid]);
      await conn.query('INSERT INTO empleado_servicios (id_usuario, id_servicio) VALUES ?', [values]);
    }

    await conn.commit();
    res.status(201).json({ ok: true, id, message: 'Empleado creado correctamente.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// PUT /api/usuarios/:id  (ADMIN)
export const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nombre, email, telefono, rol, password,
    especialidad, bio, hora_apertura, hora_cierre, puede_completar_citas,
  } = req.body;
  const servicios = normalizarServicios(req.body.servicios);
  const foto_url = req.file ? `/uploads/team/${req.file.filename}` : undefined;

  const [exist] = await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ?', [id]);
  if (!exist[0]) throw new ApiError(404, 'Usuario no encontrado.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const campos = [];
    const valores = [];
    if (nombre !== undefined) { campos.push('nombre = ?'); valores.push(nombre); }
    if (email !== undefined) { campos.push('email = ?'); valores.push(email); }
    if (telefono !== undefined) { campos.push('telefono = ?'); valores.push(telefono); }
    if (rol !== undefined) { campos.push('rol = ?'); valores.push(rol); }
    if (password) {
      if (password.length < 6) throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.');
      campos.push('password_hash = ?');
      valores.push(await bcrypt.hash(password, 10));
    }
    if (campos.length) {
      valores.push(id);
      await conn.query(`UPDATE usuarios SET ${campos.join(', ')} WHERE id_usuario = ?`, valores);
    }

    // Perfil (upsert). La foto solo se reemplaza si subieron una nueva.
    await conn.query(`
      INSERT INTO empleados_perfiles (id_usuario, especialidad, bio, foto_url, hora_apertura, hora_cierre, puede_completar_citas)
      VALUES (?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
        especialidad = COALESCE(VALUES(especialidad), especialidad),
        bio = VALUES(bio),
        foto_url = COALESCE(VALUES(foto_url), foto_url),
        hora_apertura = COALESCE(VALUES(hora_apertura), hora_apertura),
        hora_cierre = COALESCE(VALUES(hora_cierre), hora_cierre),
        puede_completar_citas = VALUES(puede_completar_citas)
    `, [id, especialidad || 'OTRO', bio ?? null, foto_url ?? null, hora_apertura ?? null, hora_cierre ?? null, esVerdadero(puede_completar_citas) ? 1 : 0]);

    if (Array.isArray(servicios)) {
      await conn.query('DELETE FROM empleado_servicios WHERE id_usuario = ?', [id]);
      if (servicios.length) {
        const values = servicios.map((sid) => [id, sid]);
        await conn.query('INSERT INTO empleado_servicios (id_usuario, id_servicio) VALUES ?', [values]);
      }
    }

    await conn.commit();
    res.json({ ok: true, message: 'Usuario actualizado.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// PUT /api/usuarios/:id/estado  (ADMIN)
export const cambiarEstado = asyncHandler(async (req, res) => {
  const { estado } = req.body;
  if (!['ACTIVO', 'INACTIVO'].includes(estado)) {
    throw new ApiError(400, 'Estado inválido.');
  }
  const [r] = await pool.query('UPDATE usuarios SET estado = ? WHERE id_usuario = ?', [estado, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({ ok: true, message: `Usuario marcado como ${estado}.` });
});

// DELETE /api/usuarios/:id  (ADMIN)
export const eliminar = asyncHandler(async (req, res) => {
  if (Number(req.params.id) === Number(req.user.id)) {
    throw new ApiError(400, 'No puedes eliminar tu propia cuenta.');
  }
  const [r] = await pool.query('DELETE FROM usuarios WHERE id_usuario = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({ ok: true, message: 'Usuario eliminado.' });
});
