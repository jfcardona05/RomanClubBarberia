import { Router } from 'express';
import * as ctrl from '../controllers/configuracion.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';
import { uploadImage } from '../middlewares/upload.middleware.js';

const router = Router();
const upload = uploadImage('site');

router.get('/public', ctrl.obtenerPublic);
router.get('/', authRequired, adminOnly, ctrl.listar);
router.put('/', authRequired, adminOnly, upload.single('hero_imagen_file'), ctrl.actualizar);

export default router;
