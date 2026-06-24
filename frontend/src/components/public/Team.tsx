import { Crown } from 'lucide-react';
import type { Usuario } from '../../types';
import { resolveImg } from '../../utils/format';

const etiqueta: Record<string, string> = {
  BARBERO: 'Barbero',
  MANICURISTA: 'Manicurista',
  OTRO: 'Profesional',
};

export default function Team({ equipo }: { equipo: Usuario[] }) {
  if (!equipo.length) return null;

  return (
    <section id="servicios" className="mx-auto max-w-7xl px-5 py-24">
      <div className="text-center">
        <span className="section-eyebrow">Quiénes somos</span>
        <h2 className="section-title">Nuestro equipo de trabajo</h2>
        <p className="mx-auto mt-3 max-w-2xl text-gray-400">
          Profesionales apasionados por tu estilo. Conoce a quienes te atenderán en Roman Club.
        </p>
      </div>

      <div className="mt-14 flex flex-wrap justify-center gap-6">
        {equipo.map((m) => (
          <article
            key={m.id_usuario}
            className="card-dark group w-full max-w-sm overflow-hidden text-center transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-gold-sm sm:w-80"
          >
            <div className="relative h-72 overflow-hidden bg-ink-50">
              {m.foto_url ? (
                <img src={resolveImg(m.foto_url)} alt={m.nombre} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gold-gradient text-7xl font-bold text-ink-900">
                  {m.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              {m.rol === 'ADMIN' && (
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-3 py-1 text-xs font-bold text-ink-900"><Crown className="h-3 w-3" /> Dueño</span>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-display text-xl font-semibold text-white">{m.nombre}</h3>
              <p className="mt-1 text-sm font-medium uppercase tracking-wide text-gold">{etiqueta[m.especialidad || 'OTRO']}</p>
              {m.bio && <p className="mt-3 text-sm text-gray-400">{m.bio}</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
