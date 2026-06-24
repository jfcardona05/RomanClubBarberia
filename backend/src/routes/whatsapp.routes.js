import { Router } from 'express';
import { authRequired } from '../middlewares/auth.middleware.js';
import { adminOnly } from '../middlewares/role.middleware.js';
import { getEstado, cerrarSesionWhatsapp } from '../services/whatsapp.service.js';

const router = Router();
router.use(authRequired, adminOnly);

// Estado de conexión + QR (si falta vincular)
router.get('/estado', (_req, res) => res.json({ ok: true, ...getEstado() }));

// Cerrar sesión y generar nuevo QR (para vincular otro número)
router.post('/reconectar', async (_req, res) => {
  await cerrarSesionWhatsapp();
  res.json({ ok: true, message: 'Sesión reiniciada. Escanea el nuevo QR.' });
});

export default router;
