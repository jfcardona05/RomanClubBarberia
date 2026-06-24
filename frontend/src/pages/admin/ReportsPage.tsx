import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { dashboardApi, usuariosApi, serviciosApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Usuario, Servicio } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, LoadingSpinner, Select } from '../../components/ui';
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

// Texto del pago para una fila (abono/resto/método)
function detallePago(p: Pago): string {
  if (p.online > 0 && p.tipo_pago === 'ABONO') {
    if (p.local > 0) return `Abonó ${formatCOP(p.online)} online · resto ${formatCOP(p.local)} en ${p.metodo_local || 'local'}`;
    return `Abonó ${formatCOP(p.online)} online · falta ${formatCOP(p.pendiente)} (pendiente)`;
  }
  if (p.online > 0 && p.tipo_pago === 'TOTAL') return `Pagó todo online: ${formatCOP(p.online)}`;
  return `En el local: ${formatCOP(p.local)} (${p.metodo_local || '—'})`; // sin pago online (llamada/WhatsApp)
}

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

  const imprimir = () => {
    if (!data) return;
    const { desde, hasta } = rangoPeriodo(periodo);
    const profTxt = idEmpleado ? (empleados.find((e) => String(e.id_usuario) === idEmpleado)?.nombre || '') : 'Todos';
    const servTxt = idServicio ? (servicios.find((s) => String(s.id_servicio) === idServicio)?.nombre || '') : 'Todos';
    const filas = data.historialPagos.map((p) => `
      <tr>
        <td>${formatFecha(String(p.fecha).slice(0, 10))} ${p.hora_inicio ? formatHora(p.hora_inicio) : ''}</td>
        <td>${p.nombre_cliente || ''}</td>
        <td>${p.servicio || ''}</td>
        <td>${p.profesional || ''}</td>
        <td style="text-align:right">${formatCOP(p.online)}</td>
        <td style="text-align:right">${p.local > 0 ? formatCOP(p.local) : (p.pendiente > 0 ? 'Pend. ' + formatCOP(p.pendiente) : '—')}</td>
        <td>${p.local > 0 ? (p.metodo_local || '') : ''}</td>
        <td style="text-align:right"><b>${formatCOP(p.total)}</b></td>
      </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo de pagos</title>
      <style>
        *{font-family:Arial,Helvetica,sans-serif;color:#111}
        h1{font-size:18px;margin:0} .sub{color:#555;font-size:12px;margin:2px 0 14px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
        th,td{border-bottom:1px solid #ddd;padding:7px 6px;text-align:left}
        th{background:#f3f3f3;text-transform:uppercase;font-size:10px;color:#555}
        .tot{margin-top:16px} .row{display:flex;justify-content:space-between;max-width:340px;margin:3px 0;font-size:13px}
      </style></head><body>
      <h1>Roman Club Barbería — Historial de pagos</h1>
      <div class="sub">Periodo: ${periodoLabel[periodo]} (${desde} a ${hasta}) · Profesional: ${profTxt} · Servicio: ${servTxt}</div>
      <table>
        <thead><tr><th>Fecha</th><th>Cliente</th><th>Servicio</th><th>Profesional</th><th style="text-align:right">Abono online</th><th style="text-align:right">Resto local</th><th>Método resto</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="8">Sin pagos en el periodo.</td></tr>'}</tbody>
      </table>
      <div class="tot">
        <div class="row"><span>Pagado online (Wompi):</span> <span>${formatCOP(data.totalOnline)}</span></div>
        <div class="row"><span>Cobrado en el local:</span> <span>${formatCOP(data.totalLocal)}</span></div>
        <div class="row"><span>Pendiente por cobrar:</span> <span>${formatCOP(data.totalPendiente)}</span></div>
        <div class="row"><b>TOTAL RECIBIDO:</b> <b>${formatCOP(data.total)}</b></div>
      </div>
      <p style="margin-top:20px;font-size:11px;color:#777">Generado el ${formatFecha(ymd(new Date()))}</p>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=900');
    if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Pagos e ingresos</h1>
          <p className="text-sm text-gray-400">{isAdmin ? 'Historial de pagos por cita (abono online + resto en el local)' : 'Tu historial de pagos'}</p>
        </div>
        <Button variant="outline" onClick={imprimir} disabled={!data}><Printer className="h-4 w-4" /> Imprimir recibo</Button>
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

      {loading || !data ? <LoadingSpinner /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <h3 className="font-display text-lg font-semibold text-white">Historial de pagos</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-400">Online: <span className="font-semibold text-green-300">{formatCOP(data.totalOnline)}</span></span>
              <span className="text-gray-400">Local: <span className="font-semibold text-gray-200">{formatCOP(data.totalLocal)}</span></span>
              {data.totalPendiente > 0 && <span className="text-gray-400">Pendiente: <span className="font-semibold text-yellow-300">{formatCOP(data.totalPendiente)}</span></span>}
              <span className="text-gray-400">Total: <span className="font-display text-base font-bold text-gold">{formatCOP(data.total)}</span></span>
            </div>
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
                    <th className="px-4 py-3">Detalle del pago</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.historialPagos.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">{formatFecha(String(p.fecha).slice(0, 10))}<br /><span className="text-xs">{p.hora_inicio ? formatHora(p.hora_inicio) : ''}</span></td>
                      <td className="px-4 py-3 text-white">{p.nombre_cliente}</td>
                      <td className="px-4 py-3 text-gray-300">{p.servicio || '—'}</td>
                      <td className="px-4 py-3 text-gray-300">{p.profesional || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-2">
                            <Badge>{p.tipo_pago === 'TOTAL' ? 'PAGO TOTAL' : p.tipo_pago === 'ABONO' ? 'ABONO 20%' : 'LOCAL'}</Badge>
                            {p.pendiente > 0 && <span className="text-xs font-semibold text-yellow-300">Falta {formatCOP(p.pendiente)}</span>}
                          </span>
                          <span className="text-xs text-gray-400">{detallePago(p)}</span>
                        </span>
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
