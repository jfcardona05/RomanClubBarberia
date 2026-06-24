import { Router } from 'express';
import * as ctrl from '../controllers/servicios.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';
import { uploadImage } from '../middlewares/upload.middleware.js';

const router = Router();
const upload = uploadImage('services');

// Público
router.get('/public', ctrl.listarPublic);

// Privado (lectura para cualquier usuario logueado, escritura solo ADMIN)
router.get('/', authRequired, ctrl.listar);
router.post('/', authRequired, adminOnly, upload.single('imagen'), ctrl.crear);
router.put('/:id', authRequired, adminOnly, upload.single('imagen'), ctrl.actualizar);
router.delete('/:id', authRequired, adminOnly, ctrl.eliminar);

export default router;
