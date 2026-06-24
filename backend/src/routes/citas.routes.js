import { Router } from 'express';
import * as ctrl from '../controllers/citas.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';

const router = Router();

// Público: cliente sin login
router.get('/disponibilidad', ctrl.disponibilidad);
router.post('/public', ctrl.crearPublic);

// Privadas
router.get('/', authRequired, ctrl.listar);              // ADMIN: todas / EMPLEADO: las suyas
router.get('/:id', authRequired, ctrl.obtener);
router.post('/', authRequired, ctrl.crear);              // creación manual
router.put('/:id', authRequired, adminOnly, ctrl.actualizar);
router.put('/:id/confirmar', authRequired, adminOnly, ctrl.confirmar);
router.put('/:id/cancelar', authRequired, adminOnly, ctrl.cancelar);
router.put('/:id/reagendar', authRequired, adminOnly, ctrl.reagendar);
router.put('/:id/completar', authRequired, ctrl.completar); // ADMIN o EMPLEADO con permiso
router.delete('/:id', authRequired, adminOnly, ctrl.eliminar);

export default router;
