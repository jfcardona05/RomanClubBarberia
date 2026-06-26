import { useEffect, useState } from 'react';
import { inventarioApi, configApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Movimiento, Producto, ConfigSitio } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Select, Textarea } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { AlertTriangle, Pencil, Trash2, Printer } from 'lucide-react';
import { formatCOP, formatFecha } from '../../utils/format';

const CATS = ['BARBERIA', 'UÑAS', 'LIMPIEZA', 'HERRAMIENTA', 'VENTA', 'OTRO'];

// Etiquetas legibles de cada tipo de movimiento
const TIPO_LABEL: Record<string, string> = {
  ENTRADA: 'Entrada (recibido)',
  SALIDA: 'Salida (venta)',
  USO_EN_SERVICIO: 'Gasto (barbero)',
  AJUSTE: 'Ajuste',
};

type PeriodoMov = 'DIA' | 'SEMANA' | 'MES' | 'TODO';
const PERIODO_LABEL: Record<PeriodoMov, string> = { DIA: 'Hoy', SEMANA: 'Semana', MES: 'Mes', TODO: 'Todo' };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rangoPeriodo(p: PeriodoMov): { desde: string; hasta: string } | null {
  if (p === 'TODO') return null;
  const hoy = new Date();
  if (p === 'DIA') return { desde: ymd(hoy), hasta: ymd(hoy) };
  if (p === 'SEMANA') {
    const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
    return { desde: ymd(lunes), hasta: ymd(domingo) };
  }
  return { desde: ymd(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: ymd(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)) };
}

export default function InventoryPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const toast = useToast();
  const [items, setItems] = useState<Producto[]>([]);
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'productos' | 'movimientos'>('productos');
  const [prodOpen, setProdOpen] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [del, setDel] = useState<Producto | null>(null);
  const [config, setConfig] = useState<ConfigSitio>({});
  const [periodo, setPeriodo] = useState<PeriodoMov>('MES');

  const cargar = () => {
    setLoading(true);
    Promise.all([inventarioApi.productos(), inventarioApi.movimientos()])
      .then(([p, m]) => { setItems(p); setMovs(m); })
      .catch((e) => toast.error(getApiError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(cargar, []);
  useEffect(() => { configApi.publica().then(setConfig).catch(() => {}); }, []);

  // Movimientos del periodo seleccionado
  const rango = rangoPeriodo(periodo);
  const movsPeriodo = movs.filter((m) => {
    if (!rango) return true;
    const d = String(m.fecha_movimiento).slice(0, 10);
    return d >= rango.desde && d <= rango.hasta;
  });

  // Valoriza al costo unitario del producto
  const costoUnit = (id: number) => Number(items.find((p) => p.id_producto === id)?.costo_unitario || 0);
  const valorMov = (m: Movimiento) => Number(m.cantidad) * costoUnit(m.id_producto);
  const totalTipo = (tipo: string) => movsPeriodo.filter((m) => m.tipo_movimiento === tipo).reduce((a, m) => a + valorMov(m), 0);
  const totalEntradas = totalTipo('ENTRADA');   // productos que ingresan
  const totalGastos = totalTipo('USO_EN_SERVICIO'); // se gastan en la barbería
  const totalSalidas = totalTipo('SALIDA');      // ventas

  const negocio = config.nombre_negocio || 'Roman Club Barbería';

  const imprimir = () => {
    const logo = `${location.origin}/img/logo.png`;
    const filas = movsPeriodo.map((m) => `
      <tr>
        <td>${formatFecha(String(m.fecha_movimiento).slice(0, 10))}</td>
        <td>${m.producto_nombre || ''}</td>
        <td>${TIPO_LABEL[m.tipo_movimiento] || m.tipo_movimiento}</td>
        <td class="r">${m.cantidad} ${m.unidad || ''}</td>
        <td>${m.usuario_nombre || '—'}</td>
        <td>${m.motivo || ''}</td>
        <td class="r">${m.tipo_movimiento === 'AJUSTE' ? '—' : formatCOP(valorMov(m))}</td>
      </tr>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Recibo de inventario · ${negocio}</title>
      <style>
        *{font-family:Arial,Helvetica,sans-serif;color:#111;box-sizing:border-box}
        body{margin:0;padding:28px}
        .head{text-align:center;border-bottom:3px solid #caa24a;padding-bottom:14px;margin-bottom:6px}
        .head img{height:74px;width:74px;border-radius:50%;object-fit:cover;border:2px solid #caa24a}
        .head h1{font-size:20px;margin:8px 0 2px}.head .mut{color:#666;font-size:11px;margin:1px 0}
        .meta{font-size:12px;color:#444;margin:14px 0 4px}.meta b{color:#111}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        th,td{border-bottom:1px solid #e3e3e3;padding:7px 6px;text-align:left;vertical-align:top}
        th{background:#faf4e4;text-transform:uppercase;font-size:10px;color:#8a6d1f}
        td.r,th.r{text-align:right}
        .tot{margin-top:18px;margin-left:auto;width:320px}
        .tot .row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px dashed #ddd}
        .tot .grand{border-top:2px solid #caa24a;border-bottom:none;margin-top:4px;padding-top:8px;font-size:15px}
        .foot{margin-top:24px;text-align:center;font-size:10px;color:#999}
      </style></head><body>
      <div class="head">
        <img src="${logo}" alt="logo" onerror="this.style.display='none'"/>
        <h1>${negocio}</h1>
        <p class="mut">Recibo de inventario</p>
      </div>
      <div class="meta">Periodo: <b>${PERIODO_LABEL[periodo]}</b>${rango ? ` (${rango.desde} a ${rango.hasta})` : ''} · Movimientos: <b>${movsPeriodo.length}</b></div>
      <table>
        <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="r">Cantidad</th><th>Usuario</th><th>Motivo</th><th class="r">Valor (costo)</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="7" style="text-align:center;color:#999;padding:18px">Sin movimientos en el periodo.</td></tr>'}</tbody>
      </table>
      <div class="tot">
        <div class="row"><span>Entradas</span><span>${formatCOP(totalEntradas)}</span></div>
        <div class="row"><span>Gastos</span><span>${formatCOP(totalGastos)}</span></div>
        <div class="row"><span>Salidas</span><span>${formatCOP(totalSalidas)}</span></div>
      </div>
      <p class="foot">Recibo generado el ${formatFecha(ymd(new Date()))} · ${negocio}</p>
      <script>window.onload=function(){setTimeout(function(){window.print()},300);}</script>
      </body></html>`;
    const w = window.open('', '_blank', 'width=950,height=950');
    if (w) { w.document.write(html); w.document.close(); } else { toast.error('Permite las ventanas emergentes para imprimir.'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Inventario</h1>
          <p className="text-sm text-gray-400">Productos, stock y movimientos</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={imprimir} disabled={loading}><Printer className="h-4 w-4" /> Imprimir recibo</Button>
          <Button variant="outline" onClick={() => setMovOpen(true)}>+ Movimiento</Button>
          {isAdmin && <Button onClick={() => { setEditing(null); setProdOpen(true); }}>+ Producto</Button>}
        </div>
      </div>

      <div className="flex gap-2">
        {(['productos', 'movimientos'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${tab === t ? 'bg-gold-gradient text-ink-900' : 'border border-white/10 text-gray-400'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : tab === 'productos' ? (
        !items.length ? <EmptyState title="Sin productos" icon="📦" /> : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-ink-50/40 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoría</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Costo</th><th className="px-4 py-3">Proveedor</th>{isAdmin && <th className="px-4 py-3 text-right">Acciones</th>}</tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((p) => {
                    const bajo = Number(p.stock_actual) <= Number(p.stock_minimo);
                    return (
                      <tr key={p.id_producto} className="hover:bg-white/5">
                        <td className="px-4 py-3 font-medium text-white">{p.nombre}</td>
                        <td className="px-4 py-3"><Badge>{p.categoria}</Badge></td>
                        <td className={`px-4 py-3 ${bajo ? 'text-red-300' : 'text-gray-300'}`}><span className="inline-flex items-center gap-1">{p.stock_actual} {p.unidad} {bajo && <AlertTriangle className="h-3.5 w-3.5" />}</span><span className="block text-xs text-gray-500">mín {p.stock_minimo}</span></td>
                        <td className="px-4 py-3 text-gray-300">{formatCOP(p.costo_unitario)}</td>
                        <td className="px-4 py-3 text-gray-400">{p.proveedor || '—'}</td>
                        {isAdmin && (
                          <td className="px-4 py-3"><div className="flex justify-end gap-1.5">
                            <button onClick={() => { setEditing(p); setProdOpen(true); }} className="rounded-lg border border-white/10 px-2 py-1.5 text-gray-300 hover:border-gold/40 hover:text-gold"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => setDel(p)} className="rounded-lg border border-white/10 px-2 py-1.5 text-gray-300 hover:border-red-500/40 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                          </div></td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        <div className="space-y-4">
          {/* Filtro de periodo + totales */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              {(['DIA', 'SEMANA', 'MES', 'TODO'] as PeriodoMov[]).map((k) => (
                <button key={k} onClick={() => setPeriodo(k)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${periodo === k ? 'bg-gold-gradient text-ink-900' : 'border border-white/10 text-gray-400 hover:border-gold/40'}`}>
                  {PERIODO_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="text-gray-400">Entradas: <span className="font-semibold text-green-300">{formatCOP(totalEntradas)}</span></span>
              <span className="text-gray-400">Gastos: <span className="font-semibold text-yellow-300">{formatCOP(totalGastos)}</span></span>
              <span className="text-gray-400">Salidas: <span className="font-semibold text-red-300">{formatCOP(totalSalidas)}</span></span>
            </div>
          </div>

          {!movsPeriodo.length ? <EmptyState title="Sin movimientos en el periodo" icon="🔄" /> : (
            <Card className="!p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 bg-ink-50/40 text-xs uppercase tracking-wide text-gray-500">
                    <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Motivo</th><th className="px-4 py-3 text-right">Valor</th></tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {movsPeriodo.map((m) => (
                      <tr key={m.id_movimiento} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-gray-400">{formatFecha(m.fecha_movimiento?.slice(0, 10))}</td>
                        <td className="px-4 py-3 text-white">{m.producto_nombre}</td>
                        <td className="px-4 py-3"><Badge>{TIPO_LABEL[m.tipo_movimiento] || m.tipo_movimiento}</Badge></td>
                        <td className="px-4 py-3 text-gray-300">{m.cantidad} {m.unidad}</td>
                        <td className="px-4 py-3 text-gray-400">{m.usuario_nombre || '—'}</td>
                        <td className="px-4 py-3 text-gray-400">{m.motivo || '—'}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{m.tipo_movimiento === 'AJUSTE' ? '—' : formatCOP(valorMov(m))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {prodOpen && <ProductModal producto={editing} onClose={() => setProdOpen(false)} onSaved={() => { setProdOpen(false); cargar(); }} />}
      {movOpen && <MovModal productos={items} onClose={() => setMovOpen(false)} onSaved={() => { setMovOpen(false); cargar(); }} />}
      <ConfirmDialog open={!!del} message={`¿Eliminar "${del?.nombre}"?`} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await inventarioApi.eliminarProducto(del!.id_producto); toast.success('Producto eliminado'); setDel(null); cargar(); } catch (e) { toast.error(getApiError(e)); } }} />
    </div>
  );
}

function ProductModal({ producto, onClose, onSaved }: { producto: Producto | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    nombre: producto?.nombre || '', categoria: producto?.categoria || 'BARBERIA', descripcion: producto?.descripcion || '',
    stock_actual: producto?.stock_actual?.toString() || '0', stock_minimo: producto?.stock_minimo?.toString() || '0',
    unidad: producto?.unidad || 'unidad', costo_unitario: producto?.costo_unitario?.toString() || '0',
    precio_venta: producto?.precio_venta?.toString() || '', proveedor: producto?.proveedor || '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.nombre) return toast.error('El nombre es obligatorio');
    setLoading(true);
    try {
      const payload: Partial<Producto> = {
        nombre: f.nombre, categoria: f.categoria as Producto['categoria'], descripcion: f.descripcion,
        stock_minimo: Number(f.stock_minimo), unidad: f.unidad, costo_unitario: Number(f.costo_unitario),
        precio_venta: f.precio_venta ? Number(f.precio_venta) : null, proveedor: f.proveedor,
      };
      if (producto) await inventarioApi.actualizarProducto(producto.id_producto, payload);
      else await inventarioApi.crearProducto({ ...payload, stock_actual: Number(f.stock_actual) });
      toast.success(producto ? 'Producto actualizado' : 'Producto creado');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={producto ? 'Editar producto' : 'Nuevo producto'}>
      <div className="space-y-4">
        <Input label="Nombre *" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Categoría" value={f.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Unidad" value={f.unidad} onChange={(e) => set('unidad', e.target.value)} placeholder="unidad, ml, caja..." />
        </div>
        <Textarea label="Descripción" rows={2} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Stock actual" type="number" value={f.stock_actual} onChange={(e) => set('stock_actual', e.target.value)} disabled={!!producto} />
          <Input label="Stock mínimo" type="number" value={f.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} />
        </div>
        {producto && <p className="-mt-2 text-xs text-gray-500">El stock se modifica con movimientos.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Costo unitario" type="number" value={f.costo_unitario} onChange={(e) => set('costo_unitario', e.target.value)} />
          <Input label="Precio de venta" type="number" value={f.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} />
        </div>
        <Input label="Proveedor" value={f.proveedor} onChange={(e) => set('proveedor', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}

function MovModal({ productos, onClose, onSaved }: { productos: Producto[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ id_producto: '', tipo_movimiento: 'ENTRADA', cantidad: '', motivo: '', observaciones: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.id_producto || !f.cantidad) return toast.error('Producto y cantidad son obligatorios');
    setLoading(true);
    try {
      await inventarioApi.crearMovimiento({
        id_producto: Number(f.id_producto), tipo_movimiento: f.tipo_movimiento as Movimiento['tipo_movimiento'],
        cantidad: Number(f.cantidad), motivo: f.motivo, observaciones: f.observaciones,
      });
      toast.success('Movimiento registrado');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title="Registrar movimiento" size="sm">
      <div className="space-y-4">
        <Select label="Producto *" value={f.id_producto} onChange={(e) => set('id_producto', e.target.value)}>
          <option value="">Selecciona...</option>
          {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.nombre} ({p.stock_actual} {p.unidad})</option>)}
        </Select>
        <Select label="Tipo" value={f.tipo_movimiento} onChange={(e) => set('tipo_movimiento', e.target.value)}>
          {['ENTRADA', 'SALIDA', 'AJUSTE', 'USO_EN_SERVICIO'].map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input label="Cantidad *" type="number" value={f.cantidad} onChange={(e) => set('cantidad', e.target.value)} />
        <p className="-mt-2 text-xs text-gray-500">AJUSTE fija el stock al valor indicado.</p>
        <Input label="Motivo" value={f.motivo} onChange={(e) => set('motivo', e.target.value)} />
        <Textarea label="Observaciones" rows={2} value={f.observaciones} onChange={(e) => set('observaciones', e.target.value)} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Registrar</Button>
        </div>
      </div>
    </Modal>
  );
}
