import type { ImagenGaleria } from '../../types';
import { resolveImg } from '../../utils/format';

export default function Gallery({ imagenes }: { imagenes: ImagenGaleria[] }) {
  if (!imagenes.length) return null;

  return (
    <section id="galeria" className="mx-auto max-w-7xl px-5 py-24">
      <div className="text-center">
        <span className="section-eyebrow">Nuestro trabajo</span>
        <h2 className="section-title">Galería</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-400">Resultados reales de Roman Club Barbería.</p>
      </div>

      {/* Solo fotos, centradas, foto completa (sin recorte) y zoom suave al pasar el cursor */}
      <div className="mt-12 flex flex-wrap justify-center gap-4">
        {imagenes.map((img) => (
          <div key={img.id_imagen} className="flex h-72 w-72 items-center justify-center overflow-hidden rounded-2xl border border-white/5 bg-ink-900">
            <img
              src={resolveImg(img.imagen_url)}
              alt=""
              className="max-h-full max-w-full object-contain transition-transform duration-500 hover:scale-105"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
