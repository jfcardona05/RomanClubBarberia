import { useEffect, useState, type ComponentType } from 'react';
import { Scissors, CalendarClock, User, DollarSign, Phone, IdCard, MessageSquare, Flag, Pencil, Ban, Trash2, CreditCard } from 'lucide-react';
import { citasApi, serviciosApi, usuariosApi, clientesApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Cita, Cliente, EstadoCita, Servicio, Usuario } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, EmptyState, Input, LoadingSpinner, Select, Textarea } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import DateTimePicker from '../../components/DateTimePicker';
import { formatCOP, formatFecha, formatHora } from '../../utils/format';

const ESTADOS: (EstadoCita | '')[] = ['', 'PENDIENTE', 'COMPLETADA', 'CANCELADA'];
type Periodo = 'TODAS' | 'DIA' | 'SEMANA' | 'MES';

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Rango de fechas (desde/hasta) según el periodo elegido
function rangoPeriodo(p: Periodo): { desde?: string; hasta?: string } {
  if (p === 'TODAS') return {};
  const hoy = new Date();
  if (p === 'DIA') return { desde: ymd(hoy), hasta: ymd(hoy) };
  if (p === 'SEMANA') {
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    return { desde: ymd(lunes), hasta: ymd(domingo) };
  }
  // MES
  return { desde: ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: ymd(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const toast = useToast();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoCita | ''>('PENDIENTE');
  const [periodo, setPeriodo] = useState<Periodo>('DIA');
  const [seleccion, setSeleccion] = useState<number | null>(null);

  // Modales
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Cita | null>(null);
  const [compOpen, setCompOpen] = useState(false);
  const [target, setTarget] = useState<Cita | null>(null);
  const [confirmDel, setConfirmDel] = useState<Cita | null>(null);

  const cargar = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filtro) params.estado = filtro;
    const { desde, hasta } = rangoPeriodo(periodo);
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    citasApi.listar(Object.keys(params).length ? params : undefined)
      .then(setCitas)
      .catch((e) => toast.error(getApiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(cargar, [filtro, periodo]);
  useEffect(() => {
    serviciosApi.listar().then(setServicios).catch(() => {});
    if (isAdmin) usuariosApi.listar().then(setEmpleados).catch(() => {});
  }, [isAdmin]);

  const accion = async (fn: Promise<unknown>, msg: string) => {
    try { await fn; toast.success(msg); setSeleccion(null); cargar(); }
    catch (e) { toast.error(getApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Citas</h1>
          <p className="text-sm text-gray-400">{isAdmin ? 'Toca una cita para ver sus opciones' : 'Tus citas asignadas'}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <Select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)} className="!py-2 flex-1 sm:flex-none">
            <option value="TODAS">Todas las fechas</option>
            <option value="DIA">Hoy</option>
            <option value="SEMANA">Esta semana</option>
            <option value="MES">Este mes</option>
          </Select>
          <Select value={filtro} onChange={(e) => setFiltro(e.target.value as EstadoCita | '')} className="!py-2 flex-1 sm:flex-none">
            {ESTADOS.map((s) => <option key={s} value={s}>{s || 'Todos los estados'}</option>)}
          </Select>
          <Button className="w-full whitespace-nowrap sm:w-auto" onClick={() => { setEditing(null); setEditOpen(true); }}>+ Nueva cita</Button>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !citas.length ? (
        <EmptyState title="No hay citas" subtitle="Cuando lleguen reservas aparecerán aquí." icon="📅" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {citas.map((c) => {
            const activa = seleccion === c.id_cita;
            const puedeCompletar = c.estado === 'PENDIENTE';
            return (
              <div
                key={c.id_cita}
                onClick={() => setSeleccion(activa ? null : c.id_cita)}
                className={`card-dark cursor-pointer p-5 transition-all duration-200 ${
                  activa ? 'border-gold/50 shadow-gold-sm ring-1 ring-gold/30' : 'hover:border-gold/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-semibold text-white">{c.nombre_cliente}</p>
                    <p className="flex items-center gap-1.5 text-xs text-gray-500"><Phone className="h-3 w-3" /> {c.telefono_cliente}</p>
                    {c.documento_cliente && <p className="flex items-center gap-1.5 text-xs text-gray-500"><IdCard className="h-3 w-3" /> {c.documento_cliente}</p>}
                  </div>
                  <Badge>{c.estado}</Badge>
                </div>

                <div className="mt-4 space-y-1.5 text-sm">
                  <Row icon={Scissors} value={c.servicios_nombres || c.servicio_nombre || 'Sin servicio'} />
                  <Row icon={CalendarClock} value={`${formatFecha(c.fecha)} · ${formatHora(c.hora_inicio)} - ${formatHora(c.hora_fin)}`} />
                  <Row icon={User} value={c.empleado_nombre || 'Sin asignar'} />
                  <Row icon={DollarSign} value={formatCOP(c.precio_final ?? c.precio_estimado ?? 0)} />
                  <Row icon={CreditCard} value={c.estado === 'COMPLETADA' ? 'Cobrada' : 'Se cobra en el local'} />
                </div>

                {c.comentarios_cliente && (
                  <p className="mt-3 flex items-start gap-2 rounded-lg border border-white/5 bg-ink-50/40 p-2 text-xs text-gray-400"><MessageSquare className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {c.comentarios_cliente}</p>
                )}

                {/* Opciones al seleccionar */}
                {activa && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4" onClick={(e) => e.stopPropagation()}>
                    {puedeCompletar && (
                      <Opcion color="green" icon={Flag} onClick={() => { setTarget(c); setCompOpen(true); }}>Completar</Opcion>
                    )}
                    {isAdmin && (
                      <>
                        <Opcion color="gold" icon={Pencil} onClick={() => { setEditing(c); setEditOpen(true); }}>Editar</Opcion>
                        {c.estado !== 'CANCELADA' && (
                          <Opcion color="orange" icon={Ban} onClick={() => accion(citasApi.cancelar(c.id_cita), 'Cita cancelada · horario liberado')}>Cancelar</Opcion>
                        )}
                        <Opcion color="red" icon={Trash2} onClick={() => setConfirmDel(c)}>Eliminar</Opcion>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editOpen && (
        <CitaFormModal cita={editing} servicios={servicios} empleados={empleados} isAdmin={isAdmin}
          onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); setSeleccion(null); cargar(); }} />
      )}
      {compOpen && target && (
        <CompletarModal cita={target} onClose={() => setCompOpen(false)} onSaved={() => { setCompOpen(false); setSeleccion(null); cargar(); }} />
      )}
      <ConfirmDialog
        open={!!confirmDel}
        title="Eliminar cita"
        message={`¿Eliminar la cita de ${confirmDel?.nombre_cliente}? Si solo quieres liberar el horario, usa "Cancelar".`}
        onCancel={() => setConfirmDel(null)}
        onConfirm={async () => { if (confirmDel) { await accion(citasApi.eliminar(confirmDel.id_cita), 'Cita eliminada'); setConfirmDel(null); } }}
      />
    </div>
  );
}

function Row({ icon: Icon, value }: { icon: ComponentType<{ className?: string }>; value: string }) {
  return <p className="flex items-center gap-2 text-gray-300"><Icon className="h-4 w-4 flex-shrink-0 text-gray-500" /><span className="truncate">{value}</span></p>;
}

const opcionColors: Record<string, string> = {
  green: 'border-green-500/40 text-green-300 hover:bg-green-500/10',
  gold: 'border-gold/40 text-gold hover:bg-gold/10',
  orange: 'border-orange-500/40 text-orange-300 hover:bg-orange-500/10',
  red: 'border-red-500/40 text-red-300 hover:bg-red-500/10',
};
function Opcion({ children, onClick, color, icon: Icon }: { children: React.ReactNode; onClick: () => void; color: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${opcionColors[color]}`}>
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

// ---------- Modal crear/editar ----------
function CitaFormModal({ cita, servicios, empleados, isAdmin, onClose, onSaved }: {
  cita: Cita | null; servicios: Servicio[]; empleados: Usuario[]; isAdmin: boolean;
  onClose: () => void; onSaved: () => void;
}) {
  const toast = useToast();
  const [f, setF] = useState({
    nombre_cliente: cita?.nombre_cliente || '',
    telefono_cliente: cita?.telefono_cliente || '',
    documento_cliente: cita?.documento_cliente || '',
    id_empleado: cita?.id_empleado?.toString() || '',
    fecha: cita?.fecha || '',
    hora_inicio: cita?.hora_inicio?.slice(0, 5) || '',
    estado: cita?.estado || 'PENDIENTE',
    observaciones_internas: cita?.observaciones_internas || '',
  });
  const [sel, setSel] = useState<number[]>(cita?.id_servicio ? [cita.id_servicio] : []);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (id: number) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  // Buscador de clientes ya registrados
  const [buscar, setBuscar] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);

  // Al editar, carga los servicios reales de la cita
  useEffect(() => {
    if (cita) citasApi.obtener(cita.id_cita).then((c) => setSel(c.servicios || [])).catch(() => {});
  }, [cita]);

  // Busca clientes mientras el barbero escribe (con pequeño retardo)
  useEffect(() => {
    if (buscar.trim().length < 2) { setResultados([]); return; }
    const t = setTimeout(() => {
      clientesApi.listar(buscar.trim()).then((data) => { setResultados(data.slice(0, 6)); setMostrarLista(true); }).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [buscar]);

  const elegirCliente = (c: Cliente) => {
    setF((p) => ({ ...p, nombre_cliente: c.nombre, telefono_cliente: c.telefono || '', documento_cliente: c.documento }));
    setBuscar('');
    setResultados([]);
    setMostrarLista(false);
  };

  const limpiarCliente = () => {
    setF((p) => ({ ...p, nombre_cliente: '', telefono_cliente: '', documento_cliente: '' }));
    setBuscar('');
    setResultados([]);
  };

  const totalPrecio = servicios.filter((s) => sel.includes(s.id_servicio)).reduce((a, s) => a + Number(s.precio || 0), 0);
  const durTotal = servicios.filter((s) => sel.includes(s.id_servicio)).reduce((a, s) => a + (s.duracion_minutos || 0), 0) || 30;

  // Servicios que ofrece el profesional elegido (si no hay profesional, ninguno para ADMIN)
  const serviciosDelProf = f.id_empleado
    ? servicios.filter((s) => (s.profesionales || []).some((p) => p.id_usuario === Number(f.id_empleado)))
    : (isAdmin ? [] : servicios);

  // Al cambiar de profesional, conserva solo los servicios válidos para él
  const cambiarProfesional = (idStr: string) => {
    setF((p) => ({ ...p, id_empleado: idStr }));
    const validos = new Set(
      servicios.filter((s) => (s.profesionales || []).some((p) => p.id_usuario === Number(idStr))).map((s) => s.id_servicio)
    );
    setSel((prev) => prev.filter((id) => validos.has(id)));
  };

  const guardar = async () => {
    if (!f.nombre_cliente) return toast.error('Busca y selecciona un cliente registrado.');
    if (!f.fecha || !f.hora_inicio) return toast.error('Elige el día y la hora de la cita.');
    setLoading(true);
    try {
      const payload = {
        nombre_cliente: f.nombre_cliente,
        telefono_cliente: f.telefono_cliente,
        documento_cliente: f.documento_cliente || undefined,
        servicios: sel,
        id_empleado: f.id_empleado ? Number(f.id_empleado) : null,
        fecha: f.fecha,
        hora_inicio: f.hora_inicio,
        estado: f.estado as EstadoCita,
        observaciones_internas: f.observaciones_internas,
      };
      if (cita) await citasApi.actualizar(cita.id_cita, payload);
      else await citasApi.crear(payload);
      toast.success(cita ? 'Cita actualizada' : 'Cita creada');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={cita ? 'Editar cita' : 'Nueva cita'}>
      <div className="space-y-4">
        {/* Cliente: se elige desde el buscador (debe estar registrado en Clientes) */}
        {f.nombre_cliente ? (
          <div className="flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 p-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient font-bold text-ink-900">{f.nombre_cliente.charAt(0).toUpperCase()}</span>
              <div>
                <p className="font-semibold text-white">{f.nombre_cliente}</p>
                <p className="flex items-center gap-1.5 text-xs text-gray-400"><IdCard className="h-3 w-3" /> {f.documento_cliente || '—'}{f.telefono_cliente ? <><span className="mx-1">·</span><Phone className="h-3 w-3" /> {f.telefono_cliente}</> : ''}</p>
              </div>
            </div>
            <button type="button" onClick={limpiarCliente} className="text-xs font-semibold text-gold hover:underline">Cambiar</button>
          </div>
        ) : (
          <div className="relative">
            <Input
              label="Buscar cliente *"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              onFocus={() => resultados.length && setMostrarLista(true)}
              placeholder="Nombre, documento o teléfono"
              autoComplete="off"
            />
            {mostrarLista && resultados.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-ink-900 shadow-card">
                {resultados.map((c) => (
                  <li key={c.id_cliente}>
                    <button type="button" onClick={() => elegirCliente(c)}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-gold/10">
                      <span className="text-white">{c.nombre}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500"><IdCard className="h-3 w-3" /> {c.documento}{c.telefono ? ` · ${c.telefono}` : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {buscar.trim().length >= 2 && !resultados.length && (
              <p className="mt-1 text-xs text-gray-500">Sin resultados. Registra al cliente primero en <span className="text-gold">Clientes</span>.</p>
            )}
          </div>
        )}
        {/* Primero el profesional */}
        {isAdmin && (
          <Select label="Profesional *" value={f.id_empleado} onChange={(e) => cambiarProfesional(e.target.value)}>
            <option value="">Selecciona un profesional</option>
            {empleados.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}{u.especialidad ? ` · ${u.especialidad}` : ''}</option>)}
          </Select>
        )}

        {/* Luego los servicios que ese profesional ofrece */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Servicios (elige uno o varios)</p>
          {isAdmin && !f.id_empleado ? (
            <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-gray-500">Selecciona primero el profesional para ver sus servicios.</p>
          ) : !serviciosDelProf.length ? (
            <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-gray-500">Este profesional no tiene servicios asignados. Asígnalos en <span className="text-gold">Empleados</span>.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {serviciosDelProf.map((s) => (
                <button key={s.id_servicio} type="button" onClick={() => toggle(s.id_servicio)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    sel.includes(s.id_servicio) ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-gray-400 hover:border-gold/40'
                  }`}>
                  {s.nombre} · {formatCOP(s.precio)}
                </button>
              ))}
            </div>
          )}
          {!!sel.length && <p className="mt-2 text-xs text-gray-400">Total estimado: <span className="font-bold text-gold">{formatCOP(totalPrecio)}</span></p>}
        </div>

        {/* Selector visual de día y hora */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Fecha y hora *</p>
          {isAdmin && !f.id_empleado ? (
            <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-gray-500">Selecciona el profesional para ver su disponibilidad.</p>
          ) : (
            <DateTimePicker
              idEmpleado={f.id_empleado ? Number(f.id_empleado) : undefined}
              duracion={durTotal}
              fecha={f.fecha?.slice(0, 10) || ''}
              hora={f.hora_inicio || ''}
              onChange={(fe, ho) => setF((p) => ({ ...p, fecha: fe, hora_inicio: ho }))}
              excluir={cita ? { fecha: cita.fecha?.slice(0, 10), hora: cita.hora_inicio?.slice(0, 5) } : undefined}
              apertura={empleados.find((u) => u.id_usuario === Number(f.id_empleado))?.hora_apertura}
              cierre={empleados.find((u) => u.id_usuario === Number(f.id_empleado))?.hora_cierre}
            />
          )}
          {f.fecha && f.hora_inicio && (
            <p className="mt-2 text-xs text-gray-400">Seleccionado: <span className="font-semibold text-gold">{formatFecha(f.fecha)} · {formatHora(f.hora_inicio)}</span></p>
          )}
        </div>

        {/* Al editar se puede cambiar el estado; al crear siempre queda CONFIRMADA */}
        {cita && (
          <Select label="Estado" value={f.estado} onChange={(e) => set('estado', e.target.value)}>
            {['PENDIENTE', 'COMPLETADA', 'CANCELADA'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        )}
        <Textarea label="Observaciones internas" rows={2} value={f.observaciones_internas} onChange={(e) => set('observaciones_internas', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Modal completar (registra precio cobrado + método en el local) ----------
function CompletarModal({ cita, onClose, onSaved }: { cita: Cita; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [precio, setPrecio] = useState((cita.precio_estimado ?? '').toString());
  const [metodo, setMetodo] = useState('EFECTIVO');
  const [obs, setObs] = useState('');
  const [loading, setLoading] = useState(false);

  const guardar = async () => {
    setLoading(true);
    try {
      const payload = { precio_final: precio ? Number(precio) : undefined, metodo_pago: metodo, observaciones: obs };
      await citasApi.completar(cita.id_cita, payload);
      toast.success('Cita atendida · pago registrado en Pagos y reportes');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title="Completar cita" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-400">Cliente: <span className="text-white">{cita.nombre_cliente}</span></p>

        <Input label="Precio cobrado (COP)" type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0" />
        <Select label="Método de pago" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          {['EFECTIVO', 'TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'TARJETA', 'OTRO'].map((m) => <option key={m} value={m}>{m}</option>)}
        </Select>

        <Textarea label="Observaciones" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Marcar atendida</Button>
        </div>
      </div>
    </Modal>
  );
}
