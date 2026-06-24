import { ApiError } from '../utils/ApiError.js';

// Restringe el acceso a uno o varios roles.  Ej: requireRole('ADMIN')
export function requireRole(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'No autenticado.'));
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return next(new ApiError(403, 'No tienes permisos para esta acción.'));
    }
    next();
  };
}

// Atajo solo para ADMIN
export const adminOnly = requireRole('ADMIN');
