import { useEffect, useState } from 'react';
import { galeriaApi } from '../../services';
import { getApiError } from '../../services/api';
import type { ImagenGaleria } from '../../types';
import { useToast } from '../../components/Toast';
import { Badge, Button, Card, EmptyState, LoadingSpinner } from '../../components/ui';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { ImageUploader } from '../../components/ImageUploader';
import { Trash2 } from 'lucide-react';
import { resolveImg } from '../../utils/format';

export default function GalleryPage() {
  const toast = useToast();
  const [items, setItems] = useState<ImagenGaleria[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ImagenGaleria | null>(null);
  const [del, setDel] = useState<ImagenGaleria | null>(null);

  const cargar = () => {
    setLoading(true);
    galeriaApi.listar().then(setItems).catch((e) => toast.error(getApiError(e))).finally(() => setLoading(false));
  };
  useEffect(cargar, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Galería</h1>
          <p className="text-sm text-gray-400">Sube las fotos de tu trabajo</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Subir imagen</Button>
      </div>

      {loading ? <LoadingSpinner /> : !items.length ? <EmptyState title="Galería vacía" icon="🖼️" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((img) => (
            <Card key={img.id_imagen} className="!p-0 overflow-hidden">
              <div className="relative h-44">
                <img src={resolveImg(img.imagen_url)} alt="" className="h-full w-full object-cover" />
                {!img.activa && <span className="absolute left-2 top-2"><Badge>INACTIVO</Badge></span>}
              </div>
              <div className="flex gap-2 p-3">
                <Button variant="outline" className="flex-1 !py-1.5" onClick={() => { setEditing(img); setOpen(true); }}>Editar</Button>
                <Button variant="danger" className="!py-1.5" onClick={() => setDel(img)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <GalleryModal img={editing} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); cargar(); }} />}
      <ConfirmDialog open={!!del} message="¿Eliminar esta imagen?" onCancel={() => setDel(null)}
        onConfirm={async () => { try { await galeriaApi.eliminar(del!.id_imagen); toast.success('Imagen eliminada'); setDel(null); cargar(); } catch (e) { toast.error(getApiError(e)); } }} />
    </div>
  );
}

function GalleryModal({ img, onClose, onSaved }: { img: ImagenGaleria | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [activa, setActiva] = useState<number>(img?.activa ?? 1);
  const [loading, setLoading] = useState(false);

  const guardar = async () => {
    if (!img && !file) return toast.error('Selecciona una imagen');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('activa', String(activa ? 1 : 0));
      if (file) fd.append('imagen', file);
      if (img) await galeriaApi.actualizar(img.id_imagen, fd);
      else await galeriaApi.crear(fd);
      toast.success(img ? 'Imagen actualizada' : 'Imagen agregada');
      onSaved();
    } catch (e) { toast.error(getApiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title={img ? 'Editar imagen' : 'Subir imagen'} size="sm">
      <div className="space-y-4">
        <ImageUploader initialUrl={img?.imagen_url} onSelect={setFile} />
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={!!activa} onChange={(e) => setActiva(e.target.checked ? 1 : 0)} className="accent-gold" />
          Mostrar en la web
        </label>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button loading={loading} onClick={guardar}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}
