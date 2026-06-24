import { useEffect, useState, type ComponentType } from 'react';
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { dashboardApi } from '../../services';
import type { ResumenDashboard } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { Badge, Card, LoadingSpinner } from '../../components/ui';
import { formatCOP, formatFecha, formatHora } from '../../utils/format';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.resumen().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const cards: { label: string; value: number; icon: ComponentType<{ className?: string }>; color: string }[] = [
    { label: 'Citas hoy', value: data.citasHoy.total, icon: CalendarDays, color: 'text-blue-300' },
    { label: 'Pendientes', value: data.citasHoy.PENDIENTE, icon: Clock, color: 'text-yellow-300' },
    { label: 'Completadas', value: data.citasHoy.COMPLETADA, icon: CheckCircle2, color: 'text-green-300' },
    { label: 'Canceladas', value: data.citasHoy.CANCELADA, icon: XCircle, color: 'text-red-300' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Hola, {user?.nombre?.split('(')[0].trim().split(' ')[0] || 'bienvenido'}</h1>
        <p className="text-sm text-gray-400">Resumen de {user?.rol === 'ADMIN' ? 'tu negocio' : 'tu actividad'} hoy</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className={`mt-1 font-display text-3xl font-bold ${c.color}`}>{c.value}</p>
            </div>
            <c.icon className={`h-8 w-8 opacity-70 ${c.color}`} />
          </Card>
        ))}
      </div>

      {/* Ingresos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="bg-gradient-to-br from-gold/10 to-transparent">
          <p className="text-xs uppercase tracking-wide text-gray-400">Ingresos del día</p>
          <p className="mt-1 font-display text-3xl font-bold text-gold">{formatCOP(data.ingresoDia)}</p>
        </Card>
        <Card className="bg-gradient-to-br from-gold/10 to-transparent">
          <p className="text-xs uppercase tracking-wide text-gray-400">Ingresos del mes</p>
          <p className="mt-1 font-display text-3xl font-bold text-gold">{formatCOP(data.ingresoMes)}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximas citas */}
        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Próximas citas</h3>
          <div className="space-y-3">
            {data.proximas.length ? data.proximas.map((c) => (
              <div key={c.id_cita} className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-50/40 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-white">{c.nombre_cliente}</p>
                  <p className="text-xs text-gray-500">{c.servicio_nombre || 'Servicio'} · {formatFecha(c.fecha)} {formatHora(c.hora_inicio)}</p>
                </div>
                <Badge>{c.estado}</Badge>
              </div>
            )) : <p className="text-sm text-gray-500">Sin citas próximas.</p>}
          </div>
        </Card>

        {/* Más vendidos */}
        <Card>
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Servicios más vendidos (30 días)</h3>
          <div className="space-y-3">
            {data.masVendidos.length ? data.masVendidos.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15 text-xs font-bold text-gold">{i + 1}</span>
                  <span className="text-sm text-gray-200">{s.nombre || 'Servicio'}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{s.cantidad}×</p>
                  <p className="text-xs text-gray-500">{formatCOP(s.ingresos)}</p>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">Aún no hay datos.</p>}
          </div>
        </Card>
      </div>

      {/* Solo ADMIN: inventario + empleados */}
      {user?.rol === 'ADMIN' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
              <AlertTriangle className="h-5 w-5 text-yellow-300" /> Alertas de inventario
            </h3>
            <div className="space-y-2">
              {data.alertasInventario.length ? data.alertasInventario.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm">
                  <span className="text-gray-200">{p.nombre}</span>
                  <span className="text-red-300">{p.stock_actual} / mín {p.stock_minimo} {p.unidad}</span>
                </div>
              )) : <p className="flex items-center gap-2 text-sm text-gray-500"><CheckCircle2 className="h-4 w-4 text-green-400" /> Todo el inventario está en orden</p>}
            </div>
          </Card>

          <Card>
            <h3 className="mb-4 font-display text-lg font-semibold text-white">Resumen por profesional (mes)</h3>
            <div className="space-y-3">
              {data.resumenEmpleados.map((e) => (
                <div key={e.id_usuario} className="flex items-center justify-between">
                  <span className="text-sm text-gray-200">{e.nombre}</span>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatCOP(e.ingresos)}</p>
                    <p className="text-xs text-gray-500">{e.servicios} servicios</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
