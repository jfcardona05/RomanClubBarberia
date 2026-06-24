import { Router } from 'express';
import { resumen, reportes } from '../controllers/dashboard.controller.js';
import { authRequired } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/resumen', authRequired, resumen);
router.get('/reportes', authRequired, reportes);

export default router;
