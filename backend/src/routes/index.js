import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usuariosRoutes from './usuarios.routes.js';
import serviciosRoutes from './servicios.routes.js';
import citasRoutes from './citas.routes.js';
import clientesRoutes from './clientes.routes.js';
import galeriaRoutes from './galeria.routes.js';
import configuracionRoutes from './configuracion.routes.js';
import inventarioRoutes from './inventario.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import whatsappRoutes from './whatsapp.routes.js';

const router = Router();

router.get('/', (_req, res) => res.json({ ok: true, message: 'API Roman Club Barbería 💈' }));

router.use('/auth', authRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/servicios', serviciosRoutes);
router.use('/citas', citasRoutes);
router.use('/clientes', clientesRoutes);
router.use('/galeria', galeriaRoutes);
router.use('/configuracion', configuracionRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/whatsapp', whatsappRoutes);

export default router;
