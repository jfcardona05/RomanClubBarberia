import { Link } from 'react-router-dom';
import type { ConfigSitio } from '../../types';
import { resolveImg } from '../../utils/format';

export default function Hero({ config }: { config: ConfigSitio }) {
  const heroImg = resolveImg(config.hero_imagen || '/img/NiggaBarber.png');
  return (
    <section id="inicio" className="relative flex min-h-screen items-center overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0">
        <img src={heroImg} alt="Roman Club Barbería" className="h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/65 via-ink/70 to-ink" />
        <div className="absolute inset-0 bg-ink-radial opacity-40" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pt-28 pb-16 lg:grid-cols-2">
        <div className="animate-fade-up">
          <span className="section-eyebrow">{config.slogan || 'Barbería premium · Villavicencio'}</span>
          <h1 className="font-display text-5xl font-extrabold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            {config.hero_titulo || 'Luce como un'} <span className="text-gold-gradient">Rey</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-gray-300">
            {config.hero_subtitulo ||
              'Barbería premium en Villavicencio. Reserva tu cita y vive la experiencia Roman Club.'}
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Link to="/reservar" className="btn-gold text-base">{config.cta_principal || 'Reservar cita'}</Link>
            <a href="#contacto" className="btn-outline text-base">Contáctanos</a>
          </div>

          <div className="mt-12 flex gap-8">
            <Stat value="+5" label="Años de experiencia" />
            <Stat value="1000+" label="Clientes felices" />
            <Stat value="5★" label="Calidad premium" />
          </div>
        </div>

        {/* Tarjeta logo / emblema */}
        <div className="hidden justify-center lg:flex">
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-gold/20 blur-3xl" />
            <img src="/img/logo.png" alt="Logo" className="relative h-80 w-80 rounded-full object-cover shadow-gold ring-2 ring-gold/30" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold text-gold">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
