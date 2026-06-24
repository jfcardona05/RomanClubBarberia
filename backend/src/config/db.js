import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Pool de conexiones reutilizable en toda la app
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'roman_club_barberia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  dateStrings: true, // devuelve DATE/TIME como string, evita desfases de zona horaria
});

// Verifica la conexión al arrancar
export async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log('✅ Conexión a MySQL establecida');
  } finally {
    conn.release();
  }
}
