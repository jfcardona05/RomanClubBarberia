import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { dashboardApi, usuariosApi, serviciosApi, configApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Usuario, Servicio, ConfigSitio } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Button, Card, EmptyState, LoadingSpinner, Select } from '../../components/ui';
import { formatCOP, formatFecha, formatHora } from '../../utils/format';

type Periodo = 'DIA' | 'SEMANA' | 'MES';
interface Pago {
  id: number; fecha: string; hora_inicio: string | null;
  nombre_cliente: string; servicio: string | null; profesional: string | null;
  metodo: string | null; total: number;
}
interface Reportes { historialPagos: Pago[]; total: number; }

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
  const [config, setConfig] = useState<ConfigSitio>({});

  const [periodo, setPeriodo] = useState<Periodo>('MES');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [idServicio, setIdServicio] = useState('');
  const [empleados, setEmpleados] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    serviciosApi.listar().then(setServicios).catch(() => {});
    configApi.publica().then(setConfig).catch(() => {});
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

  const negocio = config.nombre_negocio || 'Roman Club Barbería';
  const profNombre = idEmpleado ? (empleados.find((e) => String(e.id_usuario) === idEmpleado)?.nombre || 'Todos') : (isAdmin ? 'Todos' : user?.nombre || '');

  // Genera el recibo imprimible (logo + colores de la marca)
  const imprimir = () => {
    if (!data) return;
    const { desde, hasta } = rangoPeriodo(periodo);
    const logo = `${location.origin}/img/logo.png`;
    const filas = data.historialPagos.map((p) => `
      <tr>
        <td>${formatFecha(String(p.fecha).slice(0, 10))}${p.hora_inicio ? '<br><span class="mut">' + formatHora(p.hora_inicio) + '</span>' : ''}</td>
        <td>${p.nombre_cliente || ''}</td>
        <td>${p.servicio || ''}</td>
        <td>${p.profesional || ''}</td>
        <td>${p.metodo || '—'}</td>
        <td class="r"><b>${formatCOP(p.total)}</b></td>
      </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo · ${negocio}</title>
      <style>
        *{font-family:Arial,Helvetica,sans-serif;color:#111;box-sizing:border-box}
        body{margin:0;padding:28px}
        .head{text-align:center;border-bottom:3px solid #caa24a;padding-bottom:14px;margin-bottom:6px}
        .head img{height:74px;width:74px;border-radius:50%;object-fit:cover;border:2px solid #caa24a}
        .head h1{font-size:21px;margin:8px 0 2px;letter-spacing:.5px}
        .head .mut{color:#666;font-size:11px;margin:1px 0}
        .meta{display:flex;justify-content:space-between;flex-wrap:wrap;font-size:12px;color:#444;margin:14px 0 4px}
        .meta b{color:#111}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        th,td{border-bottom:1px solid #e3e3e3;padding:8px 6px;text-align:left;vertical-align:top}
        th{background:#faf4e4;text-transform:uppercase;font-size:10px;color:#8a6d1f;letter-spacing:.4px}
        td.r,th.r{text-align:right}
        .mut{color:#888;font-size:10px}
        .tot{margin-top:18px;margin-left:auto;width:300px}
        .tot .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px}
        .tot .grand{border-top:2px solid #caa24a;margin-top:4px;padding-top:8px;font-size:16px}
        .tot .grand b{color:#8a6d1f}
        .foot{margin-top:24px;text-align:center;font-size:10px;color:#999}
      </style></head><body>
      <div class="head">
        <img src="${logo}" alt="logo" onerror="this.style.display='none'"/>
        <h1>${negocio}</h1>
        ${config.direccion ? `<p class="mut">${config.direccion}</p>` : ''}
        ${config.telefono || config.whatsapp ? `<p class="mut">Tel: ${config.telefono || config.whatsapp}</p>` : ''}
      </div>
      <div class="meta">
        <span>Periodo: <b>${periodoLabel[periodo]}</b> (${desde} a ${hasta})</span>
        <span>Profesional: <b>${profNombre}</b></span>
      </div>
      <table>
        <thead><tr>
          <th>Fecha / Hora</th><th>Cliente</th><th>Servicio</th><th>Profesional</th><th>Método</th><th class="r">Total</th>
        </tr></thead>
        <tbody>${filas || '<tr><td colspan="6" style="text-align:center;color:#999;padding:18px">Sin pagos en el periodo.</td></tr>'}</tbody>
      </table>
      <div class="tot">
        <div class="row"><span>Citas cobradas</span><span>${data.historialPagos.length}</span></div>
        <div class="row grand"><b>TOTAL RECIBIDO</b><b>${formatCOP(data.total)}</b></div>
      </div>
      <p class="foot">Recibo generado el ${formatFecha(ymd(new Date()))} · ${negocio}</p>
      <script>window.onload=function(){setTimeout(function(){window.print()},300);}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=950');
    if (w) { w.document.write(html); w.document.close(); } else { toast.error('Permite las ventanas emergentes para imprimir.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Pagos</h1>
          <p className="text-sm text-gray-400">{isAdmin ? 'Citas completadas: cuánto se cobró y con qué método.' : 'Tu historial de pagos.'}</p>
        </div>
        <Button variant="outline" onClick={imprimir} disabled={!data || loading}><Printer className="h-4 w-4" /> Imprimir recibo</Button>
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
                    <th className="px-4 py-3">Método</th>
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
                      <td className="px-4 py-3 text-gray-300">{p.metodo || '—'}</td>
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
