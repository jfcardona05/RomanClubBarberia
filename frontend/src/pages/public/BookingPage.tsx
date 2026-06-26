import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { citasApi, serviciosApi, configApi, clientesApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Servicio, ConfigSitio, CategoriaServicio } from '../../types';
import { CheckCircle2, MessageCircle, Scissors, Sparkles, Clock } from 'lucide-react';
import { Button, Input, Textarea } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { formatCOP } from '../../utils/format';

// ===== Horario de atención y granularidad de los slots =====
const APERTURA = 9 * 60;   // 09:00
const CIERRE = 20 * 60;    // 20:00
const PASO = 15;           // intervalo entre posibles inicios (min)
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ===== Helpers de tiempo =====
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const toHora12 = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60;
  const periodo = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const horaAMin = (hora: string | null | undefined, def: number) => (hora ? toMin(String(hora)) : def);

interface BusyRange { startMin: number; endMin: number; }
type EstadoSlot = 'libre' | 'ocupado' | 'pasado';
interface Slot { start: number; end: number; free: boolean; estado: EstadoSlot; }
interface Prof { id_usuario: number; nombre: string; hora_apertura?: string | null; hora_cierre?: string | null; }

// Genera los slots dentro de la jornada del profesional (apertura/cierre en minutos)
function calcularSlots(fecha: string, rangos: BusyRange[], duracion: number, hoyStr: string, ahoraMin: number, apertura = APERTURA, cierre = CIERRE): Slot[] {
  const slots: Slot[] = [];
  const esHoy = fecha === hoyStr;
  for (let t = apertura; t + duracion <= cierre; t += PASO) {
    const end = t + duracion;
    const choca = rangos.some((r) => t < r.endMin && end > r.startMin);
    const pasado = esHoy && t <= ahoraMin;
    const estado: EstadoSlot = pasado ? 'pasado' : choca ? 'ocupado' : 'libre';
    slots.push({ start: t, end, free: estado === 'libre', estado });
  }
  return slots;
}

export default function BookingPage() {
  const toast = useToast();

  const [config, setConfig] = useState<ConfigSitio>({});
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [paso, setPaso] = useState(1);

  // Selecciones
  const [categoria, setCategoria] = useState<CategoriaServicio | null>(null);
  const [serviciosSel, setServiciosSel] = useState<Servicio[]>([]);
  const [profesional, setProfesional] = useState<Prof | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<number | null>(null);
  const [datos, setDatos] = useState({ documento_cliente: '', nombre_cliente: '', telefono_cliente: '', comentarios_cliente: '' });
  const [clienteConocido, setClienteConocido] = useState(false);

  const [busy, setBusy] = useState<Record<string, BusyRange[]>>({});
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const ahora = useMemo(() => new Date(), []);
  const hoyStr = ymd(ahora);
  const ahoraMin = ahora.getHours() * 60 + ahora.getMinutes();

  useEffect(() => {
    serviciosApi.publicos().then(setServicios).catch(() => {});
    configApi.publica().then(setConfig).catch(() => {});
  }, []);

  const categorias = useMemo(() => Array.from(new Set(servicios.map((s) => s.categoria))), [servicios]);
  const serviciosCat = servicios.filter((s) => s.categoria === categoria);

  // Duración y precio totales de los servicios elegidos
  const durTotal = serviciosSel.reduce((a, s) => a + (s.duracion_minutos || 0), 0) || 30;
  const precioTotal = serviciosSel.reduce((a, s) => a + Number(s.precio || 0), 0);

  // Profesionales que pueden hacer TODOS los servicios elegidos (intersección)
  const profesionales = useMemo<Prof[]>(() => {
    if (!serviciosSel.length) return [];
    let comunes: Prof[] = serviciosSel[0].profesionales || [];
    for (const s of serviciosSel.slice(1)) {
      const ids = new Set((s.profesionales || []).map((p) => p.id_usuario));
      comunes = comunes.filter((p) => ids.has(p.id_usuario));
    }
    return comunes;
  }, [serviciosSel]);

  // ===== Calendario =====
  const [verMes, setVerMes] = useState(() => new Date(ahora.getFullYear(), ahora.getMonth(), 1));

  useEffect(() => {
    if (!profesional || !serviciosSel.length) return;
    const desde = ymd(new Date(verMes.getFullYear(), verMes.getMonth(), 1));
    const hasta = ymd(new Date(verMes.getFullYear(), verMes.getMonth() + 1, 0));
    citasApi.disponibilidad({ id_empleado: profesional.id_usuario, desde, hasta })
      .then((rows) => {
        const map: Record<string, BusyRange[]> = {};
        rows.forEach((r) => {
          (map[r.fecha] ||= []).push({ startMin: toMin(r.hora_inicio), endMin: toMin(r.hora_fin || r.hora_inicio) });
        });
        setBusy(map);
      })
      .catch(() => setBusy({}));
  }, [profesional, serviciosSel, verMes]);

  // Jornada del profesional elegido (su propio horario)
  const apertura = horaAMin(profesional?.hora_apertura, APERTURA);
  const cierre = horaAMin(profesional?.hora_cierre, CIERRE);

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
      else estado = calcularSlots(f, busy[f] || [], durTotal, hoyStr, ahoraMin, apertura, cierre).some((s) => s.free) ? 'libre' : 'lleno';
      arr.push({ dia: d, fecha: f, estado });
    }
    return arr;
  }, [verMes, busy, durTotal, hoyStr, ahoraMin, apertura, cierre]);

  const slotsDia = fecha ? calcularSlots(fecha, busy[fecha] || [], durTotal, hoyStr, ahoraMin, apertura, cierre) : [];

  // ===== Navegación =====
  const elegirCategoria = (c: CategoriaServicio) => { setCategoria(c); setServiciosSel([]); setProfesional(null); setPaso(2); };
  const toggleServicio = (s: Servicio) => {
    setServiciosSel((prev) => prev.some((x) => x.id_servicio === s.id_servicio)
      ? prev.filter((x) => x.id_servicio !== s.id_servicio)
      : [...prev, s]);
    setProfesional(null); setFecha(null); setHora(null);
  };
  const continuarServicios = () => {
    if (!serviciosSel.length) return toast.error('Elige al menos un servicio.');
    if (profesionales.length === 1) { setProfesional(profesionales[0]); setPaso(4); }
    else { setPaso(3); }
  };
  const elegirProfesional = (p: Prof) => { setProfesional(p); setFecha(null); setHora(null); setPaso(4); };
  const elegirFecha = (f: string) => { setFecha(f); setHora(null); setPaso(5); };
  const elegirHora = (m: number) => { setHora(m); setPaso(6); };

  const buscarCliente = async () => {
    const doc = datos.documento_cliente.trim();
    if (!doc) return;
    try {
      const r = await clientesApi.buscarPublic(doc);
      if (r.existe && r.cliente) {
        setDatos((d) => ({ ...d, nombre_cliente: r.cliente!.nombre, telefono_cliente: r.cliente!.telefono || d.telefono_cliente }));
        setClienteConocido(true);
        toast.success(`¡Hola de nuevo, ${r.cliente.nombre.split(' ')[0]}!`);
      } else setClienteConocido(false);
    } catch { /* silencioso */ }
  };

  const confirmar = async () => {
    if (!datos.documento_cliente) return toast.error('Ingresa tu documento.');
    if (!datos.nombre_cliente || !datos.telefono_cliente) return toast.error('Ingresa tu nombre y teléfono.');
    const payload = {
      documento_cliente: datos.documento_cliente,
      nombre_cliente: datos.nombre_cliente,
      telefono_cliente: datos.telefono_cliente,
      servicios: serviciosSel.map((s) => s.id_servicio),
      id_empleado: profesional?.id_usuario,
      fecha: fecha!,
      hora_inicio: toHHMM(hora!),
      comentarios_cliente: datos.comentarios_cliente,
    };
    setEnviando(true);
    try {
      await citasApi.crearPublic(payload);
      setListo(true);
    } catch (e) {
      toast.error(getApiError(e));
      if (profesional && fecha) {
        citasApi.disponibilidad({ id_empleado: profesional.id_usuario, fecha }).then((rows) => {
          setBusy((prev) => ({ ...prev, [fecha]: rows.map((r) => ({ startMin: toMin(r.hora_inicio), endMin: toMin(r.hora_fin || r.hora_inicio) })) }));
        });
        setPaso(5);
      }
    } finally { setEnviando(false); }
  };

  const pasoActual = listo ? 7 : paso;
  const enCurso = new Date(verMes.getFullYear(), verMes.getMonth(), 1) <= new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const resumen = <Resumen servicios={serviciosSel} precioTotal={precioTotal} durTotal={durTotal} profesional={profesional} fecha={fecha} hora={hora} />;

  // ===== Éxito =====
  if (listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink p-4">
        <div className="animate-fade-up max-w-md card-dark p-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 text-green-400"><CheckCircle2 className="h-10 w-10" /></div>
          <h1 className="font-display text-2xl font-bold text-white">¡Solicitud enviada!</h1>
          <p className="mt-3 text-gray-400">Tu cita quedó como pendiente. Te confirmaremos pronto por WhatsApp.</p>
          <div className="mt-6 rounded-xl border border-white/10 bg-ink-50/40 p-4 text-left text-sm">{resumen}</div>
          <div className="mt-6 flex flex-col gap-3">
            {config.whatsapp && <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="btn-gold w-full"><MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp</a>}
            <Link to="/" className="btn-outline w-full">Volver al inicio</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/img/logo.png" alt="Roman Club" className="h-10 w-10 rounded-full ring-1 ring-gold/40" />
            <div className="leading-tight">
              <p className="font-display font-bold text-white">Roman Club</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-gold">Reservas</p>
            </div>
          </Link>
          <Link to="/" className="text-sm text-gray-400 hover:text-gold">✕ Cerrar</Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 py-8">
        <Stepper paso={pasoActual} onJump={(p) => { if (p < pasoActual) setPaso(p); }} />

        <div className="mt-8">
          {/* PASO 1: Categoría */}
          {paso === 1 && (
            <Step titulo="¿Qué te quieres hacer?" sub="Elige el tipo de servicio">
              <div className="grid gap-4 sm:grid-cols-2">
                {categorias.map((c) => (
                  <button key={c} onClick={() => elegirCategoria(c)}
                    className="group card-dark flex flex-col items-center gap-3 p-8 transition hover:-translate-y-1 hover:border-gold/40 hover:shadow-gold-sm">
                    <span className="text-gold">{c === 'BARBERIA' ? <Scissors className="h-12 w-12" /> : <Sparkles className="h-12 w-12" />}</span>
                    <span className="font-display text-xl font-semibold text-white">{c === 'BARBERIA' ? 'Barbería' : c === 'UÑAS' ? 'Uñas' : 'Otros'}</span>
                    <span className="text-xs text-gray-500">{servicios.filter((s) => s.categoria === c).length} servicios</span>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {/* PASO 2: Servicios (selección múltiple) */}
          {paso === 2 && (
            <Step titulo="Elige tus servicios" sub="Puedes elegir varios">
              <div className="grid gap-3 sm:grid-cols-2">
                {serviciosCat.map((s) => {
                  const sel = serviciosSel.some((x) => x.id_servicio === s.id_servicio);
                  return (
                    <button key={s.id_servicio} onClick={() => toggleServicio(s)}
                      className={`group flex items-center justify-between gap-3 rounded-2xl border p-5 text-left transition ${
                        sel ? 'border-gold bg-gold/10 shadow-gold-sm' : 'border-white/5 bg-ink-100 hover:border-gold/40'
                      }`}>
                      <div className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border text-xs ${sel ? 'border-gold bg-gold text-ink-900' : 'border-white/20 text-transparent'}`}>✓</span>
                        <div>
                          <p className="font-semibold text-white">{s.nombre}</p>
                          <p className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {s.duracion_minutos} min</p>
                        </div>
                      </div>
                      <span className="font-display text-lg font-bold text-gold">{formatCOP(s.precio)}</span>
                    </button>
                  );
                })}
              </div>

              {/* Resumen flotante + continuar */}
              <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-ink-900/95 p-4 backdrop-blur">
                <div className="text-sm">
                  <p className="text-gray-400">{serviciosSel.length} servicio(s) · {durTotal} min</p>
                  <p className="font-display text-lg font-bold text-gold">{formatCOP(precioTotal)}</p>
                </div>
                <Button onClick={continuarServicios} disabled={!serviciosSel.length}>Continuar →</Button>
              </div>
            </Step>
          )}

          {/* PASO 3: Profesional */}
          {paso === 3 && (
            <Step titulo="¿Con quién quieres tu cita?" sub="Profesionales que realizan tus servicios">
              <div className="grid gap-4 sm:grid-cols-2">
                {profesionales.map((p) => (
                  <button key={p.id_usuario} onClick={() => elegirProfesional(p)}
                    className="group card-dark flex items-center gap-4 p-5 text-left transition hover:border-gold/40 hover:shadow-gold-sm">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient text-xl font-bold text-ink-900">{p.nombre.charAt(0)}</span>
                    <div>
                      <p className="font-semibold text-white">{p.nombre}</p>
                      <p className="text-xs text-gold">Disponible</p>
                    </div>
                  </button>
                ))}
                {!profesionales.length && (
                  <p className="text-sm text-gray-500">Ningún profesional realiza todos esos servicios juntos. Prueba reservándolos por separado.</p>
                )}
              </div>
            </Step>
          )}

          {/* PASO 4: Calendario */}
          {paso === 4 && (
            <Step titulo="Elige el día" sub="Los días sin cupo aparecen en rojo">
              <div className="mx-auto max-w-md card-dark p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button disabled={enCurso} onClick={() => setVerMes(new Date(verMes.getFullYear(), verMes.getMonth() - 1, 1))}
                    className="rounded-lg px-3 py-1 text-gray-300 disabled:opacity-30 enabled:hover:bg-white/10">‹</button>
                  <p className="font-display font-semibold text-white">{MESES[verMes.getMonth()]} {verMes.getFullYear()}</p>
                  <button onClick={() => setVerMes(new Date(verMes.getFullYear(), verMes.getMonth() + 1, 1))}
                    className="rounded-lg px-3 py-1 text-gray-300 hover:bg-white/10">›</button>
                </div>
                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-gray-500">
                  {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {celdas.map((c, i) => c === null ? <span key={i} /> : (
                    <button key={i} disabled={c.estado !== 'libre'} onClick={() => elegirFecha(c.fecha)}
                      className={`aspect-square rounded-lg text-sm font-medium transition ${
                        c.estado === 'libre' ? 'bg-ink-50/60 text-gray-200 hover:bg-gold hover:text-ink-900'
                        : c.estado === 'lleno' ? 'cursor-not-allowed bg-red-500/15 text-red-400 line-through'
                        : 'cursor-not-allowed text-gray-700'
                      } ${fecha === c.fecha ? '!bg-gold !text-ink-900' : ''}`}>
                      {c.dia}
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex justify-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-ink-50/60" /> Libre</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500/30" /> Lleno</span>
                </div>
              </div>
            </Step>
          )}

          {/* PASO 5: Hora */}
          {paso === 5 && (
            <Step titulo="Elige la hora" sub={`Duración total: ${durTotal} min · en rojo lo ocupado, en gris lo que ya pasó`}>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {slotsDia.map((s) => (
                  <button key={s.start} disabled={!s.free} title={s.estado === 'pasado' ? 'Ya pasó' : s.estado === 'ocupado' ? 'Ocupado' : ''} onClick={() => elegirHora(s.start)}
                    className={`rounded-xl border px-2 py-3 text-sm font-medium transition ${
                      s.estado === 'libre' ? 'border-white/10 text-gray-200 hover:border-gold hover:bg-gold/10 hover:text-gold'
                      : s.estado === 'ocupado' ? 'cursor-not-allowed border-red-500/20 bg-red-500/10 text-red-400/70 line-through'
                      : 'cursor-not-allowed border-white/5 text-gray-600 opacity-50'
                    } ${hora === s.start ? '!border-gold !bg-gold !text-ink-900' : ''}`}>
                    {toHora12(s.start)}
                  </button>
                ))}
              </div>
              {!slotsDia.some((s) => s.free) && <p className="mt-4 text-center text-sm text-gray-400">No hay horas disponibles este día. Elige otra fecha.</p>}
            </Step>
          )}

          {/* PASO 6: Datos */}
          {paso === 6 && (
            <Step titulo="Tus datos" sub="Confirma tu reserva">
              <div className="mx-auto max-w-lg space-y-5">
                <div className="rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm">{resumen}</div>
                <div>
                  <Input label="Documento *" value={datos.documento_cliente}
                    onChange={(e) => { setDatos({ ...datos, documento_cliente: e.target.value }); setClienteConocido(false); }}
                    onBlur={buscarCliente} placeholder="Tu cédula / identificación" />
                  {clienteConocido && <p className="mt-1 text-xs text-green-400">✓ Cliente reconocido, datos autocompletados.</p>}
                </div>
                <Input label="Nombre completo *" value={datos.nombre_cliente} onChange={(e) => setDatos({ ...datos, nombre_cliente: e.target.value })} placeholder="Tu nombre" />
                <Input label="Teléfono / WhatsApp *" value={datos.telefono_cliente} onChange={(e) => setDatos({ ...datos, telefono_cliente: e.target.value })} placeholder="300 000 0000" />
                <Textarea label="Comentarios (opcional)" rows={3} value={datos.comentarios_cliente} onChange={(e) => setDatos({ ...datos, comentarios_cliente: e.target.value })} placeholder="¿Algo que debamos saber?" />

                <Button loading={enviando} onClick={confirmar} className="w-full text-base">Confirmar reserva</Button>
              </div>
            </Step>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Subcomponentes =====
function Step({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-up">
      <div className="mb-6 text-center">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Stepper({ paso, onJump }: { paso: number; onJump: (p: number) => void }) {
  const labels = ['Tipo', 'Servicios', 'Profesional', 'Día', 'Hora', 'Datos'];
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const done = paso > n;
        const active = paso === n;
        return (
          <div key={l} className="flex items-center">
            <button onClick={() => done && onJump(n)} disabled={!done}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                active ? 'bg-gold-gradient text-ink-900 shadow-gold-sm'
                : done ? 'bg-gold/20 text-gold hover:bg-gold/30'
                : 'bg-ink-50 text-gray-600'
              }`}>
              {done ? '✓' : n}
            </button>
            {i < labels.length - 1 && <span className={`h-0.5 w-4 sm:w-8 ${paso > n ? 'bg-gold/40' : 'bg-white/10'}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Resumen({ servicios, precioTotal, durTotal, profesional, fecha, hora }: {
  servicios: Servicio[]; precioTotal: number; durTotal: number; profesional: Prof | null; fecha: string | null; hora: number | null;
}) {
  const fechaTxt = fecha ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : '—';
  return (
    <ul className="space-y-1.5 text-gray-300">
      <li>
        <span className="text-gray-500">Servicios</span>
        <div className="mt-1 space-y-0.5">
          {servicios.length ? servicios.map((s) => (
            <div key={s.id_servicio} className="flex justify-between"><span className="text-white">{s.nombre}</span><span className="text-gray-400">{formatCOP(s.precio)}</span></div>
          )) : <span className="text-white">—</span>}
        </div>
      </li>
      <li className="flex justify-between border-t border-white/10 pt-1.5"><span className="text-gray-500">Total ({durTotal} min)</span><span className="font-bold text-gold">{formatCOP(precioTotal)}</span></li>
      <li className="flex justify-between"><span className="text-gray-500">Profesional</span><span className="font-medium text-white">{profesional?.nombre || 'Sin preferencia'}</span></li>
      <li className="flex justify-between"><span className="text-gray-500">Fecha</span><span className="font-medium capitalize text-white">{fechaTxt}</span></li>
      <li className="flex justify-between"><span className="text-gray-500">Hora</span><span className="font-medium text-white">{hora !== null ? toHora12(hora) : '—'}</span></li>
    </ul>
  );
}
