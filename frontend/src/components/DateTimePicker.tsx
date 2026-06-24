import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { citasApi } from '../services';
import {
  APERTURA, CIERRE, DIAS_SEMANA, MESES, calcularSlots, horaAMin, toMin, toHHMM, toHora12, ymd,
  type BusyRange,
} from '../utils/horario';

interface Props {
  idEmpleado?: number;
  duracion: number;
  fecha: string;            // YYYY-MM-DD
  hora: string;             // HH:MM
  onChange: (fecha: string, hora: string) => void;
  excluir?: { fecha: string; hora: string }; // cita en edición (no bloquear su propio horario)
  apertura?: string | null; // jornada del profesional
  cierre?: string | null;
}

// Selector visual de día + hora con disponibilidad en vivo (ocupados en rojo).
export default function DateTimePicker({ idEmpleado, duracion, fecha, hora, onChange, excluir, apertura, cierre }: Props) {
  const ahora = useMemo(() => new Date(), []);
  const hoyStr = ymd(ahora);
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();
  const aperturaMin = horaAMin(apertura, APERTURA);
  const cierreMin = horaAMin(cierre, CIERRE);

  const [verMes, setVerMes] = useState(() => {
    const base = fecha ? new Date(fecha + 'T00:00:00') : ahora;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [busy, setBusy] = useState<Record<string, BusyRange[]>>({});

  useEffect(() => {
    if (!idEmpleado) { setBusy({}); return; }
    const desde = ymd(new Date(verMes.getFullYear(), verMes.getMonth(), 1));
    const hasta = ymd(new Date(verMes.getFullYear(), verMes.getMonth() + 1, 0));
    citasApi.disponibilidad({ id_empleado: idEmpleado, desde, hasta })
      .then((rows) => {
        const map: Record<string, BusyRange[]> = {};
        rows.forEach((r) => {
          // No bloquear el horario de la propia cita que se está editando
          if (excluir && r.fecha === excluir.fecha && r.hora_inicio.slice(0, 5) === excluir.hora) return;
          (map[r.fecha] ||= []).push({ startMin: toMin(r.hora_inicio), endMin: toMin(r.hora_fin || r.hora_inicio) });
        });
        setBusy(map);
      })
      .catch(() => setBusy({}));
  }, [idEmpleado, verMes, excluir]);

  const dur = duracion || 30;

  const celdas = useMemo(() => {
    const y = verMes.getFullYear(), m = verMes.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7;
    const dias = new Date(y, m + 1, 0).getDate();
    const arr: ({ dia: number; fecha: string; estado: 'pasado' | 'lleno' | 'libre' } | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= dias; d++) {
      const f = ymd(new Date(y, m, d));
      let estado: 'pasado' | 'lleno' | 'libre';
      if (f < hoyStr) estado = 'pasado';
      else estado = calcularSlots(f, busy[f] || [], dur, hoyStr, ahoraMin, aperturaMin, cierreMin).some((s) => s.free) ? 'libre' : 'lleno';
      arr.push({ dia: d, fecha: f, estado });
    }
    return arr;
  }, [verMes, busy, dur, hoyStr, ahoraMin, aperturaMin, cierreMin]);

  const slots = fecha ? calcularSlots(fecha, busy[fecha] || [], dur, hoyStr, ahoraMin, aperturaMin, cierreMin) : [];
  const enCurso = new Date(verMes.getFullYear(), verMes.getMonth(), 1) <= new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Calendario */}
      <div className="rounded-xl border border-white/10 bg-ink-50/40 p-3">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" disabled={enCurso} onClick={() => setVerMes(new Date(verMes.getFullYear(), verMes.getMonth() - 1, 1))}
            className="rounded px-2 text-gray-300 disabled:opacity-30 enabled:hover:bg-white/10">‹</button>
          <p className="text-sm font-semibold text-white">{MESES[verMes.getMonth()]} {verMes.getFullYear()}</p>
          <button type="button" onClick={() => setVerMes(new Date(verMes.getFullYear(), verMes.getMonth() + 1, 1))}
            className="rounded px-2 text-gray-300 hover:bg-white/10">›</button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[9px] uppercase text-gray-500">
          {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {celdas.map((c, i) => c === null ? <span key={i} /> : (
            <button key={i} type="button" disabled={c.estado !== 'libre'} onClick={() => onChange(c.fecha, '')}
              className={`aspect-square rounded text-xs font-medium transition ${
                c.estado === 'libre' ? 'bg-ink-100 text-gray-200 hover:bg-gold hover:text-ink-900'
                : c.estado === 'lleno' ? 'cursor-not-allowed bg-red-500/15 text-red-400 line-through'
                : 'cursor-not-allowed text-gray-700'
              } ${fecha === c.fecha ? '!bg-gold !text-ink-900' : ''}`}>
              {c.dia}
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-3 text-[9px] text-gray-500">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-ink-100" /> Libre</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-500/30" /> Lleno</span>
        </div>
      </div>

      {/* Horas */}
      <div className="rounded-xl border border-white/10 bg-ink-50/40 p-3">
        <p className="mb-2 text-xs font-medium text-gray-400">
          {!fecha ? 'Elige primero un día' : `Horas disponibles (${dur} min)`}
        </p>
        {!fecha ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-xs text-gray-600"><CalendarDays className="h-6 w-6" />Selecciona un día</div>
        ) : (
          <div className="grid max-h-44 grid-cols-3 gap-1.5 overflow-y-auto pr-1">
            {slots.map((s) => (
              <button key={s.start} type="button" disabled={!s.free} title={s.estado === 'pasado' ? 'Ya pasó' : s.estado === 'ocupado' ? 'Ocupado' : ''} onClick={() => onChange(fecha, toHHMM(s.start))}
                className={`rounded-lg border px-1 py-1.5 text-xs font-medium transition ${
                  s.estado === 'libre' ? 'border-white/10 text-gray-200 hover:border-gold hover:bg-gold/10 hover:text-gold'
                  : s.estado === 'ocupado' ? 'cursor-not-allowed border-red-500/20 bg-red-500/10 text-red-400/60 line-through'
                  : 'cursor-not-allowed border-white/5 text-gray-600 opacity-50'
                } ${hora === toHHMM(s.start) ? '!border-gold !bg-gold !text-ink-900' : ''}`}>
                {toHora12(s.start)}
              </button>
            ))}
            {!slots.some((s) => s.free) && <p className="col-span-3 mt-2 text-center text-xs text-gray-400">No hay horas disponibles este día.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
