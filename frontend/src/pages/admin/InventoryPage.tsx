import { useEffect, useState } from 'react';
import { inventarioApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Movimiento, Producto } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Select, Textarea } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { formatCOP, formatFecha } from '../../utils/format';

const CATS = ['BARBERIA', 'UÑAS', 'LIMPIEZA', 'HERRAMIENTA', 'VENTA', 'OTRO'];

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

  const cargar = () => {
    setLoading(true);
    Promise.all([inventarioApi.productos(), inventarioApi.movimientos()])
      .then(([p, m]) => { setItems(p); setMovs(m); })
      .catch((e) => toast.error(getApiError(e)))
      .finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Inventario</h1>
          <p className="text-sm text-gray-400">Productos, stock y movimientos</p>
        </div>
        <div className="flex gap-3">
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
        !movs.length ? <EmptyState title="Sin movimientos" icon="🔄" /> : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 bg-ink-50/40 text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Cantidad</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Motivo</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {movs.map((m) => (
                    <tr key={m.id_movimiento} className="hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-400">{formatFecha(m.fecha_movimiento?.slice(0, 10))}</td>
                      <td className="px-4 py-3 text-white">{m.producto_nombre}</td>
                      <td className="px-4 py-3"><Badge>{m.tipo_movimiento}</Badge></td>
                      <td className="px-4 py-3 text-gray-300">{m.cantidad} {m.unidad}</td>
                      <td className="px-4 py-3 text-gray-400">{m.usuario_nombre || '—'}</td>
                      <td className="px-4 py-3 text-gray-400">{m.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
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
