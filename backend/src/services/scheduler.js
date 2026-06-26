// Revisa cada minuto las citas de hoy y envía recordatorios por WhatsApp
// 1 hora antes y 20 minutos antes. Marca banderas para no repetir.
import { pool } from '../config/db.js';
import { enviarWhatsapp } from './whatsapp.service.js';
import { msgConfirmacion, msgRecordatorio1h, msgRecordatorio20m } from './mensajes.js';

// Reenvía las confirmaciones que quedaron pendientes (ej. WhatsApp estaba desconectado
// cuando se creó la cita). Solo citas futuras/de hoy, no canceladas, creadas hace +2 min.
async function revisarConfirmacionesPendientes() {
  try {
    const [citas] = await pool.query(`
      SELECT c.id_cita, c.nombre_cliente, c.telefono_cliente, c.fecha, c.hora_inicio,
             u.nombre AS profesional,
             (SELECT GROUP_CONCAT(sv.nombre SEPARATOR ' + ')
                FROM cita_servicios cs JOIN servicios sv ON sv.id_servicio = cs.id_servicio
               WHERE cs.id_cita = c.id_cita) AS servicios
      FROM citas c
      LEFT JOIN usuarios u ON u.id_usuario = c.id_empleado
      WHERE c.confirmacion_enviada = 0 AND c.estado <> 'CANCELADA' AND c.fecha >= CURDATE()
        AND c.fecha_creacion < (NOW() - INTERVAL 2 MINUTE)
    `);
    for (const c of citas) {
      const ok = await enviarWhatsapp(c.telefono_cliente, msgConfirmacion({
        nombre: c.nombre_cliente, fecha: c.fecha, hora: c.hora_inicio,
        servicios: c.servicios, profesional: c.profesional,
      }));
      if (ok) await pool.query('UPDATE citas SET confirmacion_enviada = 1 WHERE id_cita = ?', [c.id_cita]);
    }
  } catch (e) {
    console.error('❌ Error reenviando confirmaciones pendientes:', e.message);
  }
}

async function revisarRecordatorios() {
  try {
    const [citas] = await pool.query(`
      SELECT c.id_cita, c.nombre_cliente, c.telefono_cliente, c.fecha, c.hora_inicio,
             c.recordatorio_1h_enviado, c.recordatorio_20m_enviado,
             u.nombre AS profesional,
             (SELECT GROUP_CONCAT(sv.nombre SEPARATOR ' + ')
                FROM cita_servicios cs JOIN servicios sv ON sv.id_servicio = cs.id_servicio
               WHERE cs.id_cita = c.id_cita) AS servicios
      FROM citas c
      LEFT JOIN usuarios u ON u.id_usuario = c.id_empleado
      WHERE c.estado = 'PENDIENTE' AND c.fecha = CURDATE()
        AND (c.recordatorio_1h_enviado = 0 OR c.recordatorio_20m_enviado = 0)
    `);
    if (!citas.length) return;

    const ahora = new Date();

    for (const c of citas) {
      const objetivo = new Date(`${String(c.fecha).slice(0, 10)}T${c.hora_inicio}`);
      const minutos = (objetivo - ahora) / 60000; // minutos que faltan

      // Recordatorio de 1 hora (ventana 40–62 min para no mandarlo si se agendó tarde)
      if (!c.recordatorio_1h_enviado && minutos <= 62 && minutos >= 40) {
        const ok = await enviarWhatsapp(c.telefono_cliente,
          msgRecordatorio1h({ nombre: c.nombre_cliente, hora: c.hora_inicio, servicios: c.servicios, profesional: c.profesional }));
        if (ok) await pool.query('UPDATE citas SET recordatorio_1h_enviado = 1 WHERE id_cita = ?', [c.id_cita]);
      }

      // Recordatorio de 20 minutos (ventana 2–21 min)
      if (!c.recordatorio_20m_enviado && minutos <= 21 && minutos >= 2) {
        const ok = await enviarWhatsapp(c.telefono_cliente,
          msgRecordatorio20m({ nombre: c.nombre_cliente, hora: c.hora_inicio, profesional: c.profesional }));
        if (ok) await pool.query('UPDATE citas SET recordatorio_20m_enviado = 1 WHERE id_cita = ?', [c.id_cita]);
      }
    }
  } catch (e) {
    console.error('❌ Error en scheduler de recordatorios:', e.message);
  }
}

async function tick() {
  await revisarConfirmacionesPendientes(); // confirmaciones que no salieron
  await revisarRecordatorios();            // recordatorios 1h y 20min
}

export function iniciarScheduler() {
  // Cada 60 segundos
  setInterval(tick, 60 * 1000);
  console.log('⏰ Scheduler activo (confirmaciones pendientes + recordatorios, cada minuto)');
}
