// Lógica compartida de horarios para el calendario y los slots de reserva.

export const APERTURA = 9 * 60;   // 09:00
export const CIERRE = 20 * 60;    // 20:00
export const PASO = 15;           // intervalo entre posibles inicios (min)

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
// Minutos -> "2:00 p.m." (solo para mostrar)
export const toHora12 = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  const periodo = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
};
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface BusyRange { startMin: number; endMin: number; }
export type EstadoSlot = 'libre' | 'ocupado' | 'pasado';
export interface Slot { start: number; end: number; free: boolean; estado: EstadoSlot; }

// Convierte "HH:MM[:SS]" a minutos, con valor por defecto si viene vacío
export const horaAMin = (hora: string | null | undefined, def: number) => {
  if (!hora) return def;
  const [h, m] = String(hora).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Posibles horas de inicio para un servicio de `duracion` min en un día,
// dentro de la jornada del profesional (apertura/cierre en minutos),
// marcando como ocupadas las que se solapan con alguna cita o ya pasaron.
export function calcularSlots(
  fecha: string, rangos: BusyRange[], duracion: number, hoyStr: string, ahoraMin: number,
  apertura: number = APERTURA, cierre: number = CIERRE,
): Slot[] {
  const slots: Slot[] = [];
  const esHoy = fecha === hoyStr;
  for (let t = apertura; t + duracion <= cierre; t += PASO) {
    const end = t + duracion;
    const choca = rangos.some((r) => t < r.endMin && end > r.startMin);
    const pasado = esHoy && t <= ahoraMin;
    // 'pasado' tiene prioridad visual sobre 'ocupado' (ya no importa que esté ocupado si ya pasó)
    const estado: EstadoSlot = pasado ? 'pasado' : choca ? 'ocupado' : 'libre';
    slots.push({ start: t, end, free: estado === 'libre', estado });
  }
  return slots;
}
