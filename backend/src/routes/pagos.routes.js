import { Router } from 'express';
import * as ctrl from '../controllers/pagos.controller.js';

const router = Router();

router.get('/config', ctrl.config);        // ¿pagos habilitados? % abono, llave pública
router.post('/iniciar', ctrl.iniciar);      // crea cita y devuelve URL de Wompi
router.post('/confirmar', ctrl.confirmar);  // confirma al volver de Wompi (por id de transacción)
router.get('/retorno', ctrl.retorno);       // Wompi vuelve aquí; confirma y reenvía al frontend
router.get('/estado', ctrl.estado);         // estado del pago por referencia
router.post('/webhook', ctrl.webhook);      // eventos de Wompi (producción)

export default router;
