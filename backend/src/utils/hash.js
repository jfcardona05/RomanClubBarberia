// Utilidad CLI para generar un hash bcrypt rápido:
//   npm run hash -- miClave
// Útil para crear o resetear contraseñas manualmente en la BD.
import bcrypt from 'bcrypt';

const plain = process.argv[2] || 'admin123';
const hash = await bcrypt.hash(plain, 10);
console.log(`Texto plano: ${plain}`);
console.log(`Hash bcrypt: ${hash}`);
