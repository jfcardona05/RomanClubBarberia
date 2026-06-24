import { Router } from 'express';
import * as ctrl from '../controllers/usuarios.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';
import { uploadImage } from '../middlewares/upload.middleware.js';

const router = Router();
const upload = uploadImage('team');

// Público: equipo de trabajo para la web (datos no sensibles)
router.get('/public/equipo', ctrl.equipoPublic);

// El resto del módulo es solo para ADMIN
router.use(authRequired, adminOnly);

router.get('/', ctrl.listar);
router.post('/', upload.single('foto'), ctrl.crear);
router.get('/:id', ctrl.obtener);
router.put('/:id', upload.single('foto'), ctrl.actualizar);
router.put('/:id/estado', ctrl.cambiarEstado);
router.delete('/:id', ctrl.eliminar);

export default router;
