import { useEffect, useState } from 'react';
import { serviciosApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Servicio } from '../../types';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Select, Textarea } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { Trash2 } from 'lucide-react';
import { formatCOP } from '../../utils/format';

export default function ServicesPage() {
  const toast = useToast();
  const [items, setItems] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Servicio | null>(null);
  const [del, setDel] = useState<Servicio | null>(null);

  const cargar = () => {
    setLoading(true);
    serviciosApi.listar().then(setItems).catch((e) => toast.error(getApiError(e))).finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Servicios</h1>
          <p className="text-sm text-gray-400">Gestiona los servicios que ofreces</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Nuevo servicio</Button>
      </div>

      {loading ? <LoadingSpinner /> : !items.length ? (
        <EmptyState title="Sin servicios" subtitle="Crea tu primer servicio." icon="✂️" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <Card key={s.id_servicio}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-white">{s.nombre}</h3>
                {!s.activo ? <Badge>INACTIVO</Badge> : <Badge>{s.categoria}</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-gray-500">{s.descripcion}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-display font-bold text-gold">{formatCOP(s.precio)}</span>
                <span className="text-xs text-gray-500">{s.duracion_minutos} min</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 !py-1.5" onClick={() => { setEditing(s); setOpen(true); }}>Editar</Button>
                <Button variant="danger" className="!py-1.5" onClick={() => setDel(s)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <ServiceModal service={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); cargar(); }} />}
      <ConfirmDialog open={!!del} message={`¿Eliminar "${del?.nombre}"?`} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await serviciosApi.eliminar(del!.id_servicio); toast.success('Servicio eliminado'); setDel(null); cargar(); } catch (e) { toast.error(getApiError(e)); } }} />
    </div>
  );
}

function ServiceModal({ service, onClose, onSaved }: { service: Servicio | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    nombre: service?.nombre || '',
    descripcion: service?.descripcion || '',
    categoria: service?.categoria || 'BARBERIA',
    precio: service?.precio?.toString() || '',
    duracion_minutos: service?.duracion_minutos?.toString() || '30',
    activo: service?.activo ?? 1,
  });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.nombre) return toast.error('El nombre es obligatorio');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('nombre', f.nombre);
      fd.append('descripcion', f.descripcion);
      fd.append('categoria', f.categoria);
      fd.append('precio', f.precio || '0');
      fd.append('duracion_minutos', f.duracion_minutos || '30');
      fd.append('activo', String(f.activo ? 1 : 0));
      if (service) await serviciosApi.actualizar(service.id_servicio, fd);
      else await serviciosApi.crear(fd);
      toast.success(service ? 'Servicio actualizado' : 'Servicio creado');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={service ? 'Editar servicio' : 'Nuevo servicio'}>
      <div className="space-y-4">
        <Input label="Nombre *" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
        <Textarea label="Descripción" rows={2} value={f.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Categoría" value={f.categoria} onChange={(e) => set('categoria', e.target.value)}>
            {['BARBERIA', 'UÑAS', 'OTRO'].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Precio (COP)" type="number" value={f.precio} onChange={(e) => set('precio', e.target.value)} />
          <Input label="Duración (min)" type="number" value={f.duracion_minutos} onChange={(e) => set('duracion_minutos', e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={!!f.activo} onChange={(e) => set('activo', e.target.checked ? 1 : 0)} className="accent-gold" />
          Servicio activo (visible en la web)
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
