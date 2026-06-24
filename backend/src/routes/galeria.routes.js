import { Router } from 'express';
import * as ctrl from '../controllers/galeria.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';
import { uploadImage } from '../middlewares/upload.middleware.js';

const router = Router();
const upload = uploadImage('gallery');

router.get('/public', ctrl.listarPublic);
router.get('/', authRequired, adminOnly, ctrl.listar);
router.post('/', authRequired, adminOnly, upload.single('imagen'), ctrl.crear);
router.put('/:id', authRequired, adminOnly, upload.single('imagen'), ctrl.actualizar);
router.delete('/:id', authRequired, adminOnly, ctrl.eliminar);

export default router;
