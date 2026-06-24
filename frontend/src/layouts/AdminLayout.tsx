import { useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, Users, Scissors, UserCog, Image as ImageIcon,
  Package, BarChart3, LogOut, Home, Menu as MenuIcon, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../services/AuthContext';

interface MenuItem { to: string; label: string; icon: ComponentType<{ className?: string }>; adminOnly?: boolean; }

const menu: MenuItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/citas', label: 'Citas', icon: CalendarDays },
  { to: '/admin/clientes', label: 'Clientes', icon: Users },
  { to: '/admin/servicios', label: 'Servicios', icon: Scissors, adminOnly: true },
  { to: '/admin/empleados', label: 'Empleados', icon: UserCog, adminOnly: true },
  { to: '/admin/galeria', label: 'Galería', icon: ImageIcon, adminOnly: true },
  { to: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle, adminOnly: true },
  { to: '/admin/inventario', label: 'Inventario', icon: Package },
  { to: '/admin/reportes', label: 'Pagos y reportes', icon: BarChart3 },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const visibles = menu.filter((m) => !m.adminOnly || user?.rol === 'ADMIN');
  const cerrar = () => { logout(); navigate('/admin/login'); };

  return (
    <div className="min-h-screen bg-ink">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-white/10 bg-ink-900 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src="/img/logo.png" alt="Roman Club" className="h-11 w-11 rounded-full ring-1 ring-gold/40" />
          <div>
            <p className="font-display font-bold text-white">Roman Club</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Panel</p>
          </div>
        </div>

        {/* Navegación (scrollable) */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {visibles.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              end={m.to === '/admin'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  isActive ? 'bg-gold/15 text-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario abajo-izquierda + cerrar sesión debajo */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gold-gradient font-bold text-ink-900">
              {user?.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.nombre}</p>
              <p className="text-[11px] uppercase tracking-wide text-gold">{user?.rol}</p>
            </div>
          </div>
          <button
            onClick={cerrar}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-gray-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-ink/90 px-5 py-3 backdrop-blur">
          <button onClick={() => setOpen(!open)} className="text-white lg:hidden" aria-label="Menú">
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="hidden lg:block" />
          {/* Volver a la página web (arriba a la derecha) */}
          <Link
            to="/"
            className="flex items-center gap-2 rounded-full border border-gold/40 px-4 py-1.5 text-sm font-semibold text-gold transition hover:bg-gold/10"
          >
            <Home className="h-4 w-4" />
            Volver a la web
          </Link>
        </header>

        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden" />}
    </div>
  );
}
