import { Router } from 'express';
import * as ctrl from '../controllers/inventario.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';

const router = Router();
router.use(authRequired);

// Productos: gestión solo ADMIN; lectura para usuarios logueados
router.get('/productos', ctrl.listarProductos);
router.post('/productos', adminOnly, ctrl.crearProducto);
router.put('/productos/:id', adminOnly, ctrl.actualizarProducto);
router.delete('/productos/:id', adminOnly, ctrl.eliminarProducto);

// Movimientos: ADMIN o EMPLEADO (registrar uso/salida)
router.get('/movimientos', ctrl.listarMovimientos);
router.post('/movimientos', ctrl.crearMovimiento);

// Alertas de stock bajo
router.get('/alertas', ctrl.alertas);

export default router;
