import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection } from './config/db.js';
import { iniciarWhatsapp } from './services/whatsapp.service.js';
import { iniciarScheduler } from './services/scheduler.js';

const PORT = process.env.PORT || 4000;

// Blindaje: un error suelto (p. ej. de WhatsApp/Baileys) NO debe tumbar el
// servidor. Si el proceso cae, Railway lo reinicia y se pierde la sesión de
// WhatsApp (vuelve a pedir QR). Por eso solo lo registramos y seguimos.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️ unhandledRejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ uncaughtException:', err?.message || err);
});

(async () => {
  try {
    await testConnection();
    // 0.0.0.0 para que también responda por 127.0.0.1 / lvh.me (retorno de Wompi)
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
      console.log(`   API base: http://localhost:${PORT}/api`);
    });
    // WhatsApp (vincular desde el panel) + recordatorios automáticos
    iniciarWhatsapp();
    iniciarScheduler();
  } catch (err) {
    console.error('❌ No se pudo iniciar el servidor (¿MySQL está activo y el .env es correcto?)');
    console.error(err.message);
    process.exit(1);
  }
})();
