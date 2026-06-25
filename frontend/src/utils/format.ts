// Formato de moneda colombiana
export function formatCOP(value: number | string | null | undefined): string {
  const n = Number(value || 0);
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

// Formato de fecha legible (YYYY-MM-DD -> 18 jun 2026)
export function formatFecha(fecha?: string | null): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('T')[0].split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[m - 1]} ${y}`;
}

// HH:MM:SS (24h) -> "2:00 p.m." (12h, formato Colombia)
export function formatHora(hora?: string | null): string {
  if (!hora) return '—';
  const [h, m] = hora.split(':').map(Number);
  const periodo = h < 12 ? 'a.m.' : 'p.m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${periodo}`;
}

// Origen del backend (vacío en dev -> proxy de Vite; en prod -> Railway)
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Resuelve la URL de una imagen: /uploads -> backend; /img o http -> tal cual
export function resolveImg(url?: string | null): string {
  if (!url) return '/img/logo.png';
  if (url.startsWith('http') || url.startsWith('/img')) return url;
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`; // en prod va al backend
  return url;
}
