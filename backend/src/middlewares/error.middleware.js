import { ApiError } from '../utils/ApiError.js';

// 404 para rutas no encontradas
export function notFound(req, _res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Manejador centralizado de errores
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  // Errores conocidos de MySQL más comunes
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ ok: false, message: 'Ya existe un registro con esos datos.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ ok: false, message: 'La imagen supera el tamaño máximo (5MB).' });
  }

  const status = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Error interno del servidor.';

  if (status >= 500) {
    console.error('❌ Error:', err);
  }

  res.status(status).json({ ok: false, message });
}
