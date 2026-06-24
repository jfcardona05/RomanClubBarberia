import { type ComponentType } from 'react';
import { MapPin, Phone, Clock, MessageCircle } from 'lucide-react';
import type { ConfigSitio } from '../../types';

export default function Location({ config }: { config: ConfigSitio }) {
  // El mapa siempre ubica la dirección configurada
  const direccion = config.direccion || 'Calle 16 No 40A 35, Villa María, Villavicencio, Colombia';
  const mapsEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(direccion)}&z=16&output=embed`;

  return (
    <section id="ubicacion" className="mx-auto max-w-7xl px-5 py-24">
      <div className="text-center">
        <span className="section-eyebrow">Te esperamos</span>
        <h2 className="section-title">Ubicación y horarios</h2>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <iframe title="Ubicación" src={mapsEmbed} className="h-80 w-full" loading="lazy" />
        </div>

        <div className="flex flex-col justify-center gap-6">
          <InfoRow icon={MapPin} title="Dirección" value={config.direccion || 'Villavicencio, Meta'} />
          <InfoRow icon={Phone} title="Teléfono / WhatsApp" value={config.telefono || '—'} />
          <div className="rounded-2xl border border-white/5 bg-ink-100/60 p-6">
            <h4 className="mb-3 flex items-center gap-2 font-semibold text-white"><Clock className="h-5 w-5 text-gold" /> Horarios de atención</h4>
            <ul className="space-y-1.5 text-sm text-gray-400">
              {config.horario_semana && <li>{config.horario_semana}</li>}
              {config.horario_sabado && <li>{config.horario_sabado}</li>}
              {config.horario_domingo && <li>{config.horario_domingo}</li>}
            </ul>
          </div>
          {config.whatsapp && (
            <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noreferrer" className="btn-gold w-fit">
              <MessageCircle className="h-4 w-4" /> Escríbenos por WhatsApp
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

function InfoRow({ icon: Icon, title, value }: { icon: ComponentType<{ className?: string }>; title: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{title}</p>
        <p className="text-white">{value}</p>
      </div>
    </div>
  );
}
