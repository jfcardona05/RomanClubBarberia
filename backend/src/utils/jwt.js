import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secreto_dev';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export function generarToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

export function verificarToken(token) {
  return jwt.verify(token, SECRET);
}
