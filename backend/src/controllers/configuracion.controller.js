import { pool } from '../config/db.js';
import { asyncHandler } from '../utils/ApiError.js';

// Convierte filas clave/valor a un objeto { clave: valor }
function rowsToObject(rows) {
  const obj = {};
  rows.forEach((r) => { obj[r.clave] = r.valor; });
  return obj;
}

// GET /api/configuracion/public - objeto plano para la landing
export const obtenerPublic = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT clave, valor FROM configuracion_sitio');
  res.json({ ok: true, data: rowsToObject(rows) });
});

// GET /api/configuracion - filas completas (panel)
export const listar = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM configuracion_sitio ORDER BY clave');
  res.json({ ok: true, data: rows });
});

// PUT /api/configuracion  (ADMIN) - upsert de un objeto { clave: valor }
export const actualizar = asyncHandler(async (req, res) => {
  // Acepta imagen subida (hero) además de pares clave/valor
  const datos = { ...req.body };
  if (req.file) datos.hero_imagen = `/uploads/site/${req.file.filename}`;

  const entries = Object.entries(datos).filter(([k]) => k && k !== 'undefined');
  if (!entries.length) return res.json({ ok: true, message: 'Sin cambios.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [clave, valor] of entries) {
      await conn.query(`
        INSERT INTO configuracion_sitio (clave, valor) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE valor = VALUES(valor)
      `, [clave, valor]);
    }
    await conn.commit();
    res.json({ ok: true, message: 'Configuración actualizada.' });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});
