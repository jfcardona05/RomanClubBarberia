import { verificarToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';

// Valida el JWT del header Authorization: Bearer <token>
export function authRequired(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'No autenticado. Falta el token.'));
  }

  try {
    const payload = verificarToken(token);
    // payload: { id, nombre, email, rol }
    req.user = payload;
    next();
  } catch {
    next(new ApiError(401, 'Token inválido o expirado.'));
  }
}
