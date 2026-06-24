import { useEffect, useState } from 'react';
import { dashboardApi, usuariosApi, serviciosApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Usuario, Servicio } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Card, EmptyState, LoadingSpinner, Select } from '../../components/ui';
import { formatCOP, formatFecha, formatHora } from '../../utils/format';

type Periodo = 'DIA' | 'SEMANA' | 'MES';
interface Pago {
  id: number; fecha: string; hora_inicio: string | null;
  nombre_cliente: string; servicio: string | null; profesional: string | null;
  tipo_pago: string; estado_pago: string; estado: string;
  total: number; online: number; local: number; pendiente: number; metodo_local: string | null;
}
interface Reportes { historialPagos: Pago[]; total: number; totalOnline: number; totalLocal: number; totalPendiente: number; }

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rangoPeriodo(p: Periodo): { desde: string; hasta: string } {
  const hoy = new Date();
  if (p === 'DIA') return { desde: ymd(hoy), hasta: ymd(hoy) };
  if (p === 'SEMANA') {
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    return { desde: ymd(lunes), hasta: ymd(domingo) };
  }
  return { desde: ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: ymd(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
}
const periodoLabel: Record<Periodo, string> = { DIA: 'Hoy', SEMANA: 'Esta semana', MES: 'Este mes' };

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const toast = useToast();
  const [data, setData] = useState<Reportes | null>(null);
  const [loading, setLoading] = useState(true);

  const [periodo, setPeriodo] = useState<Periodo>('MES');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [idServicio, setIdServicio] = useState('');
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    serviciosApi.listar().then(setServicios).catch(() => {});
    if (isAdmin) usuariosApi.listar().then(setEmpleados).catch(() => {});
  }, [isAdmin]);

  const cargar = () => {
    setLoading(true);
    const { desde, hasta } = rangoPeriodo(periodo);
    const params: Record<string, string> = { desde, hasta };
    if (idEmpleado) params.id_empleado = idEmpleado;
    if (idServicio) params.id_servicio = idServicio;
    dashboardApi.reportes(params).then(setData).catch((e) => toast.error(getApiError(e))).finally(() => setLoading(false));
  };
  useEffect(cargar, [periodo, idEmpleado, idServicio]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Pagos e ingresos</h1>
        <p className="text-sm text-gray-400">{isAdmin ? 'Cuánto pagó cada cliente en línea, cuánto faltó y el total.' : 'Tu historial de pagos.'}</p>
      </div>

      {/* Filtros */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">Periodo</p>
            <div className="flex gap-2">
              {(['DIA', 'SEMANA', 'MES'] as Periodo[]).map((k) => (
                <button key={k} onClick={() => setPeriodo(k)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${periodo === k ? 'bg-gold-gradient text-ink-900' : 'border border-white/10 text-gray-300 hover:border-gold/40'}`}>
                  {periodoLabel[k]}
                </button>
              ))}
            </div>
          </div>
          {isAdmin && (
            <Select label="Profesional" value={idEmpleado} onChange={(e) => setIdEmpleado(e.target.value)} className="w-full sm:w-44">
              <option value="">Todos</option>
              {empleados.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre}</option>)}
            </Select>
          )}
          <Select label="Servicio" value={idServicio} onChange={(e) => setIdServicio(e.target.value)} className="w-full sm:w-44">
            <option value="">Todos</option>
            {servicios.map((s) => <option key={s.id_servicio} value={s.id_servicio}>{s.nombre}</option>)}
          </Select>
        </div>
      </Card>

      {/* Resumen rápido */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ResumenCard label="Pagado online" value={data.totalOnline} color="text-green-300" hint="Por la página (Wompi)" />
          <ResumenCard label="Cobrado en el local" value={data.totalLocal} color="text-gray-100" hint="Efectivo / otros" />
          <ResumenCard label="Pendiente por cobrar" value={data.totalPendiente} color="text-yellow-300" hint="Abonos sin completar" />
          <ResumenCard label="Total recibido" value={data.total} color="text-gold" hint="Online + local" big />
        </div>
      )}

      {loading || !data ? <LoadingSpinner /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-white/10 px-5 py-4">
            <h3 className="font-display text-lg font-semibold text-white">Detalle por cita</h3>
          </div>

          {data.historialPagos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-ink-50/40 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Fecha / Hora</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Profesional</th>
                    <th className="px-4 py-3 text-right">Pagó online</th>
                    <th className="px-4 py-3 text-right">Falta / resto</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.historialPagos.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                        {formatFecha(String(p.fecha).slice(0, 10))}
                        <br /><span className="text-xs">{p.hora_inicio ? formatHora(p.hora_inicio) : ''}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-white">{p.nombre_cliente}</td>
                      <td className="px-4 py-3 text-gray-300">{p.servicio || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{p.profesional || '—'}</td>
                      {/* Pagó online */}
                      <td className="px-4 py-3 text-right">
                        {p.online > 0
                          ? <span className="font-semibold text-green-300">{formatCOP(p.online)}</span>
                          : <span className="text-gray-600">—</span>}
                      </td>
                      {/* Falta / resto */}
                      <td className="px-4 py-3 text-right">
                        {p.pendiente > 0 ? (
                          <span className="font-semibold text-yellow-300">Falta {formatCOP(p.pendiente)}</span>
                        ) : p.local > 0 ? (
                          <span className="text-gray-200">{formatCOP(p.local)} <span className="text-xs text-gray-500">{p.metodo_local || ''}</span></span>
                        ) : (
                          <span className="text-xs font-semibold text-green-400">✓ Todo pagado</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gold">{formatCOP(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="p-5"><EmptyState title="Sin pagos en el periodo" subtitle="Cambia el periodo o los filtros." /></div>}
        </Card>
      )}
    </div>
  );
}

function ResumenCard({ label, value, color, hint, big }: { label: string; value: number; color: string; hint: string; big?: boolean }) {
  return (
    <Card className={big ? 'bg-gradient-to-br from-gold/10 to-transparent' : ''}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${color}`}>{formatCOP(value)}</p>
      <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
    </Card>
  );
}
