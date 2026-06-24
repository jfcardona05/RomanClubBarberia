import { pool } from '../config/db.js';
import { ApiError, asyncHandler } from '../utils/ApiError.js';

// ---------- PRODUCTOS ----------

// GET /api/inventario/productos
export const listarProductos = asyncHandler(async (req, res) => {
  const { categoria, activo } = req.query;
  const where = [];
  const params = [];
  if (categoria) { where.push('categoria = ?'); params.push(categoria); }
  if (activo !== undefined) { where.push('activo = ?'); params.push(activo === 'true' || activo === '1' ? 1 : 0); }
  const [rows] = await pool.query(
    `SELECT * FROM inventario_productos ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY nombre`,
    params
  );
  res.json({ ok: true, data: rows });
});

// POST /api/inventario/productos
export const crearProducto = asyncHandler(async (req, res) => {
  const {
    nombre, categoria = 'OTRO', descripcion, stock_actual = 0, stock_minimo = 0,
    unidad = 'unidad', costo_unitario = 0, precio_venta, proveedor, activo = 1,
  } = req.body;
  if (!nombre) throw new ApiError(400, 'El nombre del producto es obligatorio.');

  const [r] = await pool.query(`
    INSERT INTO inventario_productos
      (nombre, categoria, descripcion, stock_actual, stock_minimo, unidad, costo_unitario, precio_venta, proveedor, activo)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `, [nombre, categoria, descripcion || null, stock_actual, stock_minimo, unidad,
      costo_unitario, precio_venta ?? null, proveedor || null, activo ? 1 : 0]);
  res.status(201).json({ ok: true, id: r.insertId, message: 'Producto creado.' });
});

// PUT /api/inventario/productos/:id
export const actualizarProducto = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  const [r] = await pool.query(`
    UPDATE inventario_productos SET
      nombre = COALESCE(?, nombre),
      categoria = COALESCE(?, categoria),
      descripcion = ?,
      stock_minimo = COALESCE(?, stock_minimo),
      unidad = COALESCE(?, unidad),
      costo_unitario = COALESCE(?, costo_unitario),
      precio_venta = ?,
      proveedor = ?,
      activo = COALESCE(?, activo)
    WHERE id_producto = ?
  `, [b.nombre ?? null, b.categoria ?? null, b.descripcion ?? null, b.stock_minimo ?? null,
      b.unidad ?? null, b.costo_unitario ?? null, b.precio_venta ?? null, b.proveedor ?? null,
      b.activo === undefined ? null : (b.activo ? 1 : 0), id]);
  if (!r.affectedRows) throw new ApiError(404, 'Producto no encontrado.');
  res.json({ ok: true, message: 'Producto actualizado.' });
});

// DELETE /api/inventario/productos/:id
export const eliminarProducto = asyncHandler(async (req, res) => {
  const [r] = await pool.query('DELETE FROM inventario_productos WHERE id_producto = ?', [req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Producto no encontrado.');
  res.json({ ok: true, message: 'Producto eliminado.' });
});

// ---------- MOVIMIENTOS ----------

// GET /api/inventario/movimientos
export const listarMovimientos = asyncHandler(async (req, res) => {
  const { id_producto } = req.query;
  const where = [];
  const params = [];
  if (id_producto) { where.push('m.id_producto = ?'); params.push(id_producto); }
  const [rows] = await pool.query(`
    SELECT m.*, p.nombre AS producto_nombre, p.unidad, u.nombre AS usuario_nombre
    FROM inventario_movimientos m
    JOIN inventario_productos p ON p.id_producto = m.id_producto
    LEFT JOIN usuarios u ON u.id_usuario = m.id_usuario
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY m.fecha_movimiento DESC
    LIMIT 300
  `, params);
  res.json({ ok: true, data: rows });
});

// POST /api/inventario/movimientos - actualiza stock según el tipo
export const crearMovimiento = asyncHandler(async (req, res) => {
  const { id_producto, tipo_movimiento, cantidad, motivo, observaciones } = req.body;
  if (!id_producto || !tipo_movimiento || cantidad === undefined) {
    throw new ApiError(400, 'Producto, tipo y cantidad son obligatorios.');
  }
  const cant = Number(cantidad);
  if (isNaN(cant) || cant <= 0) throw new ApiError(400, 'La cantidad debe ser mayor a cero.');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [pr] = await conn.query('SELECT stock_actual FROM inventario_productos WHERE id_producto = ? FOR UPDATE', [id_producto]);
    if (!pr[0]) throw new ApiError(404, 'Producto no encontrado.');

    let nuevoStock = Number(pr[0].stock_actual);
    if (tipo_movimiento === 'ENTRADA') nuevoStock += cant;
    else if (tipo_movimiento === 'SALIDA' || tipo_movimiento === 'USO_EN_SERVICIO') nuevoStock -= cant;
    else if (tipo_movimiento === 'AJUSTE') nuevoStock = cant; // ajuste fija el stock al valor dado
    else throw new ApiError(400, 'Tipo de movimiento inválido.');

    if (nuevoStock < 0) throw new ApiError(400, 'El stock no puede quedar negativo.');

    await conn.query('UPDATE inventario_productos SET stock_actual = ? WHERE id_producto = ?', [nuevoStock, id_producto]);
    await conn.query(`
      INSERT INTO inventario_movimientos (id_producto, id_usuario, tipo_movimiento, cantidad, motivo, observaciones)
      VALUES (?,?,?,?,?,?)
    `, [id_producto, req.user.id, tipo_movimiento, cant, motivo || null, observaciones || null]);

    await conn.commit();
    res.status(201).json({ ok: true, message: 'Movimiento registrado.', stock_actual: nuevoStock });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
});

// GET /api/inventario/alertas - productos con stock <= mínimo
export const alertas = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT id_producto, nombre, categoria, stock_actual, stock_minimo, unidad
    FROM inventario_productos
    WHERE activo = 1 AND stock_actual <= stock_minimo
    ORDER BY (stock_minimo - stock_actual) DESC
  `);
  res.json({ ok: true, data: rows });
});
