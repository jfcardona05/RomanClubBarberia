import { useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { dashboardApi, usuariosApi, configApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Usuario, ConfigSitio } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Button, Card, LoadingSpinner, Select } from '../../components/ui';
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

// Texto corto de "falta / resto" para cada fila
function restoTexto(p: Pago): string {
  if (p.pendiente > 0) return `Falta ${formatCOP(p.pendiente)}`;
  if (p.local > 0) return `${formatCOP(p.local)}${p.metodo_local ? ` (${p.metodo_local})` : ''}`;
  return '✓ Pagado';
}

export default function ReceiptPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const toast = useToast();
  const [data, setData] = useState<Reportes | null>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<ConfigSitio>({});

  const [periodo, setPeriodo] = useState<Periodo>('DIA');
  const [idEmpleado, setIdEmpleado] = useState('');
  const [empleados, setEmpleados] = useState<Usuario[]>([]);

  useEffect(() => {
    configApi.publica().then(setConfig).catch(() => {});
    if (isAdmin) usuariosApi.listar().then(setEmpleados).catch(() => {});
  }, [isAdmin]);

  const cargar = () => {
    setLoading(true);
    const { desde, hasta } = rangoPeriodo(periodo);
    const params: Record<string, string> = { desde, hasta };
    if (idEmpleado) params.id_empleado = idEmpleado;
    dashboardApi.reportes(params).then(setData).catch((e) => toast.error(getApiError(e))).finally(() => setLoading(false));
  };
  useEffect(cargar, [periodo, idEmpleado]);

  const negocio = config.nombre_negocio || 'Roman Club Barbería';
  const profNombre = idEmpleado ? (empleados.find((e) => String(e.id_usuario) === idEmpleado)?.nombre || 'Todos') : (isAdmin ? 'Todos' : user?.nombre || '');
  const { desde, hasta } = rangoPeriodo(periodo);

  const imprimir = () => {
    if (!data) return;
    const logo = `${location.origin}/img/logo.png`;
    const filas = data.historialPagos.map((p) => `
      <tr>
        <td>${formatFecha(String(p.fecha).slice(0, 10))}${p.hora_inicio ? '<br><span class="mut">' + formatHora(p.hora_inicio) + '</span>' : ''}</td>
        <td>${p.nombre_cliente || ''}<br><span class="mut">${p.servicio || ''}</span></td>
        <td>${p.profesional || ''}</td>
        <td class="r">${p.online > 0 ? formatCOP(p.online) : '—'}</td>
        <td class="r">${restoTexto(p)}</td>
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
        .tot .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px dashed #ddd}
        .tot .grand{border-top:2px solid #caa24a;border-bottom:none;margin-top:4px;padding-top:8px;font-size:16px}
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
          <th>Fecha / Hora</th><th>Cliente</th><th>Profesional</th>
          <th class="r">Pagó online</th><th class="r">Falta / resto</th><th class="r">Total</th>
        </tr></thead>
        <tbody>${filas || '<tr><td colspan="6" style="text-align:center;color:#999;padding:18px">Sin pagos en el periodo.</td></tr>'}</tbody>
      </table>
      <div class="tot">
        <div class="row"><span>Pagado online (Wompi)</span><span>${formatCOP(data.totalOnline)}</span></div>
        <div class="row"><span>Cobrado en el local</span><span>${formatCOP(data.totalLocal)}</span></div>
        ${data.totalPendiente > 0 ? `<div class="row"><span>Pendiente por cobrar</span><span>${formatCOP(data.totalPendiente)}</span></div>` : ''}
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
          <h1 className="font-display text-2xl font-bold text-white">Recibo</h1>
          <p className="text-sm text-gray-400">Genera e imprime el recibo de pagos por día, semana o mes.</p>
        </div>
        <Button onClick={imprimir} disabled={!data || loading}><Printer className="h-4 w-4" /> Imprimir recibo</Button>
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
        </div>
      </Card>

      {/* Vista previa del recibo (con los colores de la marca) */}
      {loading || !data ? <LoadingSpinner /> : (
        <Card className="!p-0 overflow-hidden">
          {/* Cabecera con logo y nombre */}
          <div className="flex flex-col items-center gap-2 border-b-2 border-gold/60 bg-gradient-to-b from-gold/10 to-transparent px-5 py-6 text-center">
            <img src="/img/logo.png" alt="Logo" className="h-16 w-16 rounded-full object-cover ring-2 ring-gold/50" />
            <h2 className="font-display text-xl font-bold text-white">{negocio}</h2>
            {config.direccion && <p className="text-xs text-gray-400">{config.direccion}</p>}
            {(config.telefono || config.whatsapp) && <p className="text-xs text-gray-400">Tel: {config.telefono || config.whatsapp}</p>}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-5 py-3 text-sm text-gray-400">
            <span>Periodo: <b className="text-white">{periodoLabel[periodo]}</b> <span className="text-xs">({desde} a {hasta})</span></span>
            <span>Profesional: <b className="text-white">{profNombre}</b></span>
          </div>

          {/* Tabla */}
          {data.historialPagos.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-ink-50/40 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Fecha / Hora</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Profesional</th>
                    <th className="px-4 py-3 text-right">Pagó online</th>
                    <th className="px-4 py-3 text-right">Falta / resto</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {data.historialPagos.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-400">{formatFecha(String(p.fecha).slice(0, 10))}<br /><span className="text-xs">{p.hora_inicio ? formatHora(p.hora_inicio) : ''}</span></td>
                      <td className="px-4 py-3"><span className="font-medium text-white">{p.nombre_cliente}</span><br /><span className="text-xs text-gray-500">{p.servicio || '—'}</span></td>
                      <td className="px-4 py-3 text-gray-300">{p.profesional || '—'}</td>
                      <td className="px-4 py-3 text-right">{p.online > 0 ? <span className="font-semibold text-green-300">{formatCOP(p.online)}</span> : <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-3 text-right">{p.pendiente > 0 ? <span className="font-semibold text-yellow-300">Falta {formatCOP(p.pendiente)}</span> : p.local > 0 ? <span className="text-gray-200">{formatCOP(p.local)} <span className="text-xs text-gray-500">{p.metodo_local || ''}</span></span> : <span className="text-xs font-semibold text-green-400">✓ Pagado</span>}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gold">{formatCOP(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="px-5 py-10 text-center text-sm text-gray-500">Sin pagos en el periodo seleccionado.</p>}

          {/* Totales */}
          <div className="flex flex-col items-end gap-1 border-t border-white/10 px-5 py-4 text-sm">
            <div className="flex w-full max-w-xs justify-between text-gray-400"><span>Pagado online</span><span className="text-green-300">{formatCOP(data.totalOnline)}</span></div>
            <div className="flex w-full max-w-xs justify-between text-gray-400"><span>Cobrado en el local</span><span className="text-gray-200">{formatCOP(data.totalLocal)}</span></div>
            {data.totalPendiente > 0 && <div className="flex w-full max-w-xs justify-between text-gray-400"><span>Pendiente por cobrar</span><span className="text-yellow-300">{formatCOP(data.totalPendiente)}</span></div>}
            <div className="mt-1 flex w-full max-w-xs justify-between border-t border-gold/40 pt-2 font-display text-base font-bold"><span className="text-white">Total recibido</span><span className="text-gold">{formatCOP(data.total)}</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}
