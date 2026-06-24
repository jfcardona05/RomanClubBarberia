import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../services/AuthContext';

// El orden coincide con el orden de las secciones en la página
const links = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#servicios', label: 'Equipo' },
  { href: '#galeria', label: 'Galería' },
  { href: '#citas', label: 'Citas' },
  { href: '#ubicacion', label: 'Ubicación' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contacto', label: 'Contacto' },
];

export default function Navbar() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Si ya hay sesión, entra directo al panel; si no, al login
  const accesoTo = user ? '/admin' : '/admin/login';
  const accesoLabel = user ? 'Ir al panel' : 'Acceso barbería';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled ? 'border-b border-white/10 bg-ink/90 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
        <a href="#inicio" className="flex items-center gap-3">
          <img src="/img/logo.png" alt="Roman Club" className="h-12 w-12 rounded-full ring-1 ring-gold/40" />
          <div className="leading-tight">
            <p className="font-display text-lg font-bold text-white">Roman Club</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold">Barbería</p>
          </div>
        </a>

        <ul className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-sm font-medium text-gray-300 transition hover:text-gold">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            to={accesoTo}
            className="hidden items-center gap-2 rounded-full border border-gold/60 bg-ink-900 px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold hover:text-ink-900 lg:inline-flex"
          >
            {accesoLabel}
          </Link>
          <button onClick={() => setOpen(!open)} className="text-white lg:hidden" aria-label="Menú">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </nav>

      {/* Menú móvil */}
      {open && (
        <div className="border-t border-white/10 bg-ink/95 px-5 py-4 lg:hidden">
          <ul className="flex flex-col gap-3">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="block py-1 text-gray-300 hover:text-gold">{l.label}</a>
              </li>
            ))}
            <Link to={accesoTo} onClick={() => setOpen(false)} className="mt-2 w-full rounded-full border border-gold/60 bg-ink-900 px-4 py-2.5 text-center text-sm font-semibold text-gold transition hover:bg-gold hover:text-ink-900">{accesoLabel}</Link>
          </ul>
        </div>
      )}
    </header>
  );
}
