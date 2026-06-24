import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { generarToken } from '../utils/jwt.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email y contraseña son obligatorios.');
  }

  const [rows] = await pool.query(
    'SELECT id_usuario, nombre, email, password_hash, rol, estado FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );
  const user = rows[0];
  if (!user) throw new ApiError(401, 'Credenciales incorrectas.');
  if (user.estado !== 'ACTIVO') throw new ApiError(403, 'Tu cuenta está inactiva.');

  const valido = await bcrypt.compare(password, user.password_hash);
  if (!valido) throw new ApiError(401, 'Credenciales incorrectas.');

  const payload = { id: user.id_usuario, nombre: user.nombre, email: user.email, rol: user.rol };
  const token = generarToken(payload);

  res.json({ ok: true, token, usuario: payload });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id_usuario AS id, id_usuario, nombre, email, telefono, rol, estado FROM usuarios WHERE id_usuario = ? LIMIT 1',
    [req.user.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({ ok: true, usuario: rows[0] });
});
