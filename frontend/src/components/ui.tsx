import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { Inbox } from 'lucide-react';

// ---------- Button ----------
type Variant = 'gold' | 'outline' | 'ghost' | 'danger';
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}
export function Button({ variant = 'gold', loading, children, className = '', disabled, ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:pointer-events-none';
  const variants: Record<Variant, string> = {
    gold: 'bg-gold-gradient text-ink-900 shadow-gold-sm hover:brightness-110',
    outline: 'border border-gold/60 text-gold hover:bg-gold/10',
    ghost: 'text-gray-300 hover:bg-white/5',
    danger: 'border border-red-500/50 text-red-300 hover:bg-red-500/10',
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} disabled={disabled || loading} {...rest}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

// ---------- Field wrapper ----------
function Label({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>}
      {children}
    </label>
  );
}

const fieldCls =
  'w-full rounded-xl border border-white/10 bg-ink-50/60 px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none transition focus:border-gold/60 focus:ring-1 focus:ring-gold/40';

// ---------- Input ----------
interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; }
export function Input({ label, className = '', ...rest }: InputProps) {
  return <Label label={label}><input className={`${fieldCls} ${className}`} {...rest} /></Label>;
}

// ---------- Textarea ----------
interface TAProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; }
export function Textarea({ label, className = '', ...rest }: TAProps) {
  return <Label label={label}><textarea className={`${fieldCls} ${className}`} {...rest} /></Label>;
}

// ---------- Select ----------
interface SelProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; }
export function Select({ label, className = '', children, ...rest }: SelProps) {
  return <Label label={label}><select className={`${fieldCls} ${className}`} {...rest}>{children}</select></Label>;
}

// ---------- Card ----------
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-dark p-5 ${className}`}>{children}</div>;
}

// ---------- Badge ----------
const badgeColors: Record<string, string> = {
  PENDIENTE: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  CONFIRMADA: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  CANCELADA: 'bg-red-500/15 text-red-300 border-red-500/30',
  COMPLETADA: 'bg-green-500/15 text-green-300 border-green-500/30',
  REAGENDADA: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  ACTIVO: 'bg-green-500/15 text-green-300 border-green-500/30',
  INACTIVO: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  BARBERIA: 'bg-gold/15 text-gold-light border-gold/30',
  'UÑAS': 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  OTRO: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
};
export function Badge({ children }: { children: string }) {
  const cls = badgeColors[children] || 'bg-gray-500/15 text-gray-300 border-gray-500/30';
  return <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{children}</span>;
}

// ---------- LoadingSpinner ----------
export function LoadingSpinner({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ---------- EmptyState ----------
export function EmptyState({ title, subtitle }: { title: string; subtitle?: string; icon?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 py-16 text-center">
      <Inbox className="h-10 w-10 text-gray-600" />
      <h3 className="font-display text-lg text-white">{title}</h3>
      {subtitle && <p className="max-w-sm text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
}
