import { Router } from 'express';
import * as ctrl from '../controllers/clientes.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';

const router = Router();

// Público: lookup por documento para autocompletar la reserva
router.get('/public/:documento', ctrl.buscarPublic);

// Privado (usuarios logueados pueden ver; solo ADMIN modifica)
router.get('/', authRequired, ctrl.listar);
router.get('/:id', authRequired, ctrl.obtener);
router.post('/', authRequired, adminOnly, ctrl.crear);
router.put('/:id', authRequired, adminOnly, ctrl.actualizar);
router.delete('/:id', authRequired, adminOnly, ctrl.eliminar);

export default router;
