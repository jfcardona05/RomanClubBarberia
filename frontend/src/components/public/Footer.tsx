import { MapPin, Phone, Mail, MessageCircle } from 'lucide-react';
import type { ConfigSitio } from '../../types';

export default function Footer({ config }: { config: ConfigSitio }) {
  const year = new Date().getFullYear();
  return (
    <footer id="contacto" className="border-t border-white/10 bg-ink-900">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3">
            <img src="/img/logo.png" alt="Roman Club" className="h-14 w-14 rounded-full ring-1 ring-gold/40" />
            <div>
              <p className="font-display text-lg font-bold text-white">Roman Club</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Barbería</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-400">{config.slogan || 'Estilo, presencia y actitud'}</p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Contacto</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold" /> {config.direccion || 'Villavicencio, Meta'}</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold" /> {config.telefono || '—'}</li>
            {config.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-gold" /> {config.email}</li>}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Horarios</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            {config.horario_semana && <li>{config.horario_semana}</li>}
            {config.horario_sabado && <li>{config.horario_sabado}</li>}
            {config.horario_domingo && <li>{config.horario_domingo}</li>}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-white">Síguenos</h4>
          <div className="flex gap-3">
            {config.instagram && <SocialLink href={config.instagram} label="IG" />}
            {config.facebook && <SocialLink href={config.facebook} label="FB" />}
            {config.tiktok && <SocialLink href={config.tiktok} label="TT" />}
          </div>
          {config.whatsapp && (
            <a
              href={`https://wa.me/${config.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-600/20 px-4 py-2 text-sm font-medium text-green-300 transition hover:bg-green-600/30"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 py-5 text-center text-xs text-gray-500">
        © {year} Roman Club Barbería. Todos los derechos reservados.
      </div>
    </footer>
  );
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 text-xs font-bold text-gold transition hover:bg-gold hover:text-ink-900"
    >
      {label}
    </a>
  );
}
