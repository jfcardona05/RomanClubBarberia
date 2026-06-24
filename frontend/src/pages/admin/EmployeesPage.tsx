import { useEffect, useState } from 'react';
import { usuariosApi, serviciosApi } from '../../services';
import { getApiError } from '../../services/api';
import type { Servicio, Usuario } from '../../types';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, Input, LoadingSpinner, Select, Textarea } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { useAuth } from '../../services/AuthContext';
import { resolveImg } from '../../utils/format';
import { Phone, Pause, Play, Trash2 } from 'lucide-react';

export default function EmployeesPage() {
  const toast = useToast();
  const { user: authUser, refreshUser } = useAuth();
  const [items, setItems] = useState<Usuario[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [del, setDel] = useState<Usuario | null>(null);

  const cargar = () => {
    setLoading(true);
    usuariosApi.listar().then(setItems).catch((e) => toast.error(getApiError(e))).finally(() => setLoading(false));
  };
  useEffect(() => { cargar(); serviciosApi.listar().then(setServicios).catch(() => {}); }, []);

  const toggleEstado = async (u: Usuario) => {
    try { await usuariosApi.cambiarEstado(u.id_usuario, u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO'); cargar(); }
    catch (e) { toast.error(getApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Empleados</h1>
          <p className="text-sm text-gray-400">Crea cuentas y asigna servicios al equipo</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Nuevo empleado</Button>
      </div>

      {loading ? <LoadingSpinner /> : !items.length ? <EmptyState title="Sin empleados" icon="👥" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((u) => (
            <Card key={u.id_usuario}>
              <div className="flex items-center gap-3">
                {u.foto_url ? (
                  <img src={resolveImg(u.foto_url)} alt={u.nombre} className="h-12 w-12 rounded-full object-cover ring-1 ring-gold/40" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient font-bold text-ink-900">
                    {u.nombre.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-white">{u.nombre}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <Badge>{u.estado || 'ACTIVO'}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>{u.rol}</Badge>
                {u.especialidad && <span className="rounded-full border border-white/10 px-2 py-0.5 text-gray-400">{u.especialidad}</span>}
              </div>
              {u.telefono && <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500"><Phone className="h-3 w-3" /> {u.telefono}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 !py-1.5" onClick={() => { setEditing(u); setOpen(true); }}>Editar</Button>
                <Button variant="ghost" className="!py-1.5" title={u.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'} onClick={() => toggleEstado(u)}>{u.estado === 'ACTIVO' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
                <Button variant="danger" className="!py-1.5" onClick={() => setDel(u)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <EmployeeModal user={editing} servicios={servicios} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); cargar(); if (editing && authUser?.id === editing.id_usuario) refreshUser(); }} />}
      <ConfirmDialog open={!!del} message={`¿Eliminar a ${del?.nombre}?`} onCancel={() => setDel(null)}
        onConfirm={async () => { try { await usuariosApi.eliminar(del!.id_usuario); toast.success('Empleado eliminado'); setDel(null); cargar(); } catch (e) { toast.error(getApiError(e)); } }} />
    </div>
  );
}

function EmployeeModal({ user, servicios, onClose, onSaved }: { user: Usuario | null; servicios: Servicio[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    nombre: user?.nombre || '', email: user?.email || '', telefono: user?.telefono || '',
    password: '', rol: user?.rol || 'EMPLEADO', especialidad: user?.especialidad || 'BARBERO',
    bio: user?.bio || '',
    hora_apertura: user?.hora_apertura?.slice(0, 5) || '09:00',
    hora_cierre: user?.hora_cierre?.slice(0, 5) || '20:00',
    puede_completar_citas: user?.puede_completar_citas ?? 1,
  });
  const [sel, setSel] = useState<number[]>(user?.servicios || []);
  const [foto, setFoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  // Si editamos, traer servicios asignados actuales
  useEffect(() => {
    if (user) usuariosApi.obtener(user.id_usuario).then((u) => setSel(u.servicios || [])).catch(() => {});
  }, [user]);

  const toggle = (id: number) => setSel((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const guardar = async () => {
    if (!f.nombre || !f.email) return toast.error('Nombre y email son obligatorios');
    if (!user && !f.password) return toast.error('La contraseña es obligatoria');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('nombre', f.nombre);
      fd.append('email', f.email);
      fd.append('telefono', f.telefono || '');
      if (f.password) fd.append('password', f.password);
      fd.append('rol', f.rol);
      fd.append('especialidad', f.especialidad);
      fd.append('bio', f.bio || '');
      fd.append('hora_apertura', f.hora_apertura || '09:00');
      fd.append('hora_cierre', f.hora_cierre || '20:00');
      fd.append('puede_completar_citas', String(f.puede_completar_citas ? 1 : 0));
      fd.append('servicios', JSON.stringify(sel));
      if (foto) fd.append('foto', foto);
      if (user) await usuariosApi.actualizar(user.id_usuario, fd);
      else await usuariosApi.crear(fd);
      toast.success(user ? 'Empleado actualizado' : 'Empleado creado');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={user ? 'Editar empleado' : 'Nuevo empleado'}>
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Nombre *" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} />
          <Input label="Teléfono" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} />
        </div>
        <Input label="Email *" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        <Input label={user ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'} type="password" value={f.password} onChange={(e) => set('password', e.target.value)} />
        <ImageUploader label="Foto (se mostrará en la web)" initialUrl={user?.foto_url} onSelect={setFoto} />
        <Textarea label="Descripción (se muestra en la web)" rows={3} value={f.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Ej: Barbero con 5 años de experiencia, especialista en degradados." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Rol" value={f.rol} onChange={(e) => set('rol', e.target.value)}>
            <option value="EMPLEADO">EMPLEADO</option>
            <option value="ADMIN">ADMIN</option>
          </Select>
          <Select label="Especialidad" value={f.especialidad} onChange={(e) => set('especialidad', e.target.value)}>
            {['BARBERO', 'MANICURISTA', 'OTRO'].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Inicio de jornada" type="time" value={f.hora_apertura} onChange={(e) => set('hora_apertura', e.target.value)} />
          <Input label="Fin de jornada" type="time" value={f.hora_cierre} onChange={(e) => set('hora_cierre', e.target.value)} />
        </div>
        <p className="-mt-1 text-xs text-gray-500">Cada profesional atiende solo dentro de su jornada. Los clientes verán esos horarios al reservar.</p>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={!!f.puede_completar_citas} onChange={(e) => set('puede_completar_citas', e.target.checked ? 1 : 0)} className="accent-gold" />
          Puede marcar citas como completadas
        </label>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Servicios que ofrece</p>
          <div className="flex flex-wrap gap-2">
            {servicios.map((s) => (
              <button key={s.id_servicio} type="button" onClick={() => toggle(s.id_servicio)}
                className={`rounded-full border px-3 py-1 text-xs transition ${sel.includes(s.id_servicio) ? 'border-gold bg-gold/15 text-gold' : 'border-white/10 text-gray-400 hover:border-gold/40'}`}>
                {s.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
