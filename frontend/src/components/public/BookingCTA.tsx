import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MessageCircle } from 'lucide-react';
import type { Servicio, CategoriaServicio, ConfigSitio } from '../../types';
import { formatCOP } from '../../utils/format';

const tabs: { key: CategoriaServicio | 'TODOS'; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'BARBERIA', label: 'Barbería' },
  { key: 'UÑAS', label: 'Uñas' },
  { key: 'OTRO', label: 'Otros' },
];

const pasos = [
  { n: '1', t: 'Elige tu servicio', d: 'Barbería o uñas' },
  { n: '2', t: 'Escoge profesional', d: 'Quién te atiende' },
  { n: '3', t: 'Día y hora', d: 'Ves cupos en vivo' },
  { n: '4', t: 'Confirma', d: 'Te avisamos por WhatsApp' },
];

// Sección unificada: lista de precios + llamado a reservar (que lleva a /reservar)
export default function BookingCTA({ servicios, config }: { servicios: Servicio[]; config: ConfigSitio }) {
  const [tab, setTab] = useState<CategoriaServicio | 'TODOS'>('TODOS');
  const filtrados = tab === 'TODOS' ? servicios : servicios.filter((s) => s.categoria === tab);

  return (
    <section id="precios" className="border-y border-white/5 bg-ink-900/50 py-24">
      <div className="mx-auto max-w-7xl px-5">
        <div className="text-center">
          <span className="section-eyebrow">Precios & reservas</span>
          <h2 className="section-title">Reserva tu cita en segundos</h2>
          <p className="mx-auto mt-3 max-w-2xl text-gray-400">Mira nuestros precios y agenda online viendo los cupos disponibles en tiempo real.</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          {/* Lista de precios */}
          <div className="lg:col-span-3">
            <div className="mb-5 flex flex-wrap gap-2">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    tab === t.key ? 'bg-gold-gradient text-ink-900' : 'border border-white/10 text-gray-300 hover:border-gold/40'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {filtrados.map((s) => (
                <div key={s.id_servicio} className="flex items-center justify-between rounded-xl border border-white/5 bg-ink-100/60 px-4 py-3 transition hover:border-gold/30">
                  <div>
                    <p className="text-sm font-medium text-white">{s.nombre}</p>
                    <p className="flex items-center gap-1 text-xs text-gray-500"><Clock className="h-3 w-3" /> {s.duracion_minutos} min</p>
                  </div>
                  <span className="font-display font-bold text-gold">{formatCOP(s.precio)}</span>
                </div>
              ))}
              {!filtrados.length && <p className="col-span-2 text-sm text-gray-500">No hay servicios en esta categoría.</p>}
            </div>
          </div>

          {/* CTA de reserva */}
          <div id="citas" className="lg:col-span-2">
            <div className="card-dark relative overflow-hidden p-7">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
              <h3 className="font-display text-2xl font-bold text-white">¿List@ para tu cambio de look?</h3>
              <p className="mt-2 text-sm text-gray-400">Agenda en 4 pasos. No necesitas crear cuenta.</p>

              <ul className="mt-6 space-y-4">
                {pasos.map((p) => (
                  <li key={p.n} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gold/15 font-bold text-gold">{p.n}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{p.t}</p>
                      <p className="text-xs text-gray-500">{p.d}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <Link to="/reservar" className="btn-gold mt-7 w-full text-base">Reservar cita →</Link>
              {config.whatsapp && (
                <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-green-500/40 py-2.5 text-sm font-semibold text-green-300 transition hover:bg-green-500/10">
                  <MessageCircle className="h-4 w-4" /> O escríbenos por WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
