// Plantillas de los mensajes de WhatsApp para las citas
const NEGOCIO = 'Roman Club Barbería';
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-06-30" -> "martes 30 de junio"
function fechaLarga(fecha) {
  if (!fecha) return '';
  const [y, m, d] = String(fecha).slice(0, 10).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS[dt.getDay()]} ${d} de ${MESES[m - 1]}`;
}

// Hora "HH:MM:SS" (24h) -> "2:00 p.m."
function hora12(h) {
  if (!h) return '';
  const [hh, mm] = String(h).split(':').map(Number);
  const p = hh < 12 ? 'a.m.' : 'p.m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm || 0).padStart(2, '0')} ${p}`;
}

// data: { nombre, fecha, hora, servicios, profesional }
export function msgConfirmacion({ nombre, fecha, hora, servicios, profesional }) {
  const serv = servicios ? `\n💈 Servicio: ${servicios}` : '';
  const prof = profesional ? `\n👤 Te atiende: ${profesional}` : '';
  return (
    `¡Hola ${nombre}! 👋\n\n` +
    `Tu cita en *${NEGOCIO}* quedó agendada ✅${serv}${prof}\n` +
    `🗓️ ${fechaLarga(fecha)}\n` +
    `🕒 ${hora12(hora)}\n\n` +
    `Te esperamos. Si necesitas cambiarla, respóndenos por aquí.`
  );
}

const cop = (n) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function msgRecordatorio1h({ nombre, hora, servicios, profesional }) {
  const serv = servicios ? ` (${servicios})` : '';
  const prof = profesional ? ` con ${profesional}` : '';
  return (
    `Hola ${nombre} 👋\n\n` +
    `Te recordamos tu cita en *${NEGOCIO}* hoy a las *${hora12(hora)}*${serv}${prof}.\n` +
    `Falta *1 hora*, ¡que no se te olvide! Te esperamos.`
  );
}

export function msgRecordatorio20m({ nombre, hora, profesional }) {
  const prof = profesional ? ` con ${profesional}` : '';
  return (
    `Hola ${nombre} ⏰\n\n` +
    `Tu cita en *${NEGOCIO}*${prof} es en *20 minutos* (${hora12(hora)}).\n` +
    `¡Ya casi! Te esperamos.`
  );
}
