import { useEffect, useState } from 'react';
import { clientesApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Cliente } from '../../types';
import { useAuth } from '../../services/AuthContext';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Textarea } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { IdCard, Phone, Mail, StickyNote, Trash2, Pencil } from 'lucide-react';
import { formatCOP, formatFecha } from '../../utils/format';

export default function ClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMIN';
  const toast = useToast();
  const [items, setItems] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [detalle, setDetalle] = useState<Cliente | null>(null);
  const [del, setDel] = useState<Cliente | null>(null);

  const cargar = (query = '') => {
    setLoading(true);
    clientesApi.listar(query).then(setItems).catch((e) => toast.error(getApiError(e))).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); }, []);

  const verDetalle = async (c: Cliente) => {
    try { setDetalle(await clientesApi.obtener(c.id_cliente)); }
    catch (e) { toast.error(getApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Clientes</h1>
          <p className="text-sm text-gray-400">Base de datos de clientes (identificados por documento)</p>
        </div>
        <div className="flex gap-3">
          <form onSubmit={(e) => { e.preventDefault(); cargar(q); }} className="flex gap-2">
            <Input placeholder="Buscar por documento, nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
            <Button variant="outline" type="submit">Buscar</Button>
          </form>
          {isAdmin && <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Nuevo cliente</Button>}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !items.length ? (
        <EmptyState title="Sin clientes" subtitle="Los clientes se registran solos al reservar, o créalos manualmente." icon="🧑" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <Card key={c.id_cliente} className="transition hover:border-gold/30">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient font-bold text-ink-900">{c.nombre.charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{c.nombre}</p>
                  <p className="flex items-center gap-1.5 text-xs text-gray-500"><IdCard className="h-3 w-3" /> {c.documento}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                {c.telefono && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {c.telefono}</p>}
                {c.email && <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {c.email}</p>}
                <p className="flex gap-3 pt-1">
                  <span className="text-gold">{c.total_citas || 0} citas</span>
                  {c.ultima_visita && <span>· últ. {formatFecha(c.ultima_visita)}</span>}
                </p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 !py-1.5" onClick={() => verDetalle(c)}>Ver historial</Button>
                {isAdmin && <Button variant="ghost" className="!py-1.5" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>}
                {isAdmin && <Button variant="danger" className="!py-1.5" onClick={() => setDel(c)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <ClientModal cliente={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); cargar(q); }} />}
      {detalle && <DetalleModal cliente={detalle} onClose={() => setDetalle(null)} />}
      <ConfirmDialog open={!!del} message={`¿Eliminar a ${del?.nombre}? Sus citas quedarán sin vincular.`} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await clientesApi.eliminar(del!.id_cliente); toast.success('Cliente eliminado'); setDel(null); cargar(q); } catch (e) { toast.error(getApiError(e)); } }} />
    </div>
  );
}

function ClientModal({ cliente, onClose, onSaved }: { cliente: Cliente | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    documento: cliente?.documento || '', nombre: cliente?.nombre || '',
    telefono: cliente?.telefono || '', email: cliente?.email || '', notas: cliente?.notas || '',
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.documento || !f.nombre) return toast.error('Documento y nombre son obligatorios');
    setLoading(true);
    try {
      if (cliente) await clientesApi.actualizar(cliente.id_cliente, f);
      else await clientesApi.crear(f);
      toast.success(cliente ? 'Cliente actualizado' : 'Cliente registrado');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={cliente ? 'Editar cliente' : 'Nuevo cliente'}>
      <div className="space-y-4">
        <Input label="Documento *" value={f.documento} onChange={(e) => set('documento', e.target.value)} placeholder="Cédula / identificación" />
        <Input label="Nombre completo *" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Teléfono" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} />
          <Input label="Email" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <Textarea label="Notas" rows={2} value={f.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Preferencias, alergias, etc." />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}

function DetalleModal({ cliente, onClose }: { cliente: Cliente; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={cliente.nombre}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="Documento" value={cliente.documento} />
          <Info label="Teléfono" value={cliente.telefono || '—'} />
          <Info label="Email" value={cliente.email || '—'} />
          <Info label="Total de citas" value={String(cliente.total_citas ?? cliente.historial?.length ?? 0)} />
        </div>
        {cliente.notas && <p className="flex items-start gap-2 rounded-lg border border-white/10 bg-ink-50/40 p-3 text-sm text-gray-300"><StickyNote className="mt-0.5 h-4 w-4 flex-shrink-0" /> {cliente.notas}</p>}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-white">Historial de citas</h4>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {cliente.historial?.length ? cliente.historial.map((h) => (
              <div key={h.id_cita} className="flex items-center justify-between rounded-lg border border-white/5 bg-ink-50/40 px-3 py-2 text-sm">
                <div>
                  <p className="text-white">{h.servicio_nombre || 'Servicio'}</p>
                  <p className="text-xs text-gray-500">{formatFecha(h.fecha)} · {h.empleado_nombre || '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gold">{formatCOP(h.precio_final ?? h.precio_estimado ?? 0)}</span>
                  <Badge>{h.estado}</Badge>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">Sin citas registradas.</p>}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-ink-50/40 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  );
}
