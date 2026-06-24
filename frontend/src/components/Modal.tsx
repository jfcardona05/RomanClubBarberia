import type { ReactNode } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };
  return (
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4"
      onClick={onClose}
    >
      <div
        className={`animate-modal-in my-8 w-full ${widths[size]} card-dark p-6 will-change-transform`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}
export function ConfirmDialog({ open, title = 'Confirmar', message, confirmText = 'Eliminar', onConfirm, onCancel, loading }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="animate-overlay-in fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4" onClick={onCancel}>
      <div className="animate-modal-in w-full max-w-sm card-dark p-6 text-center will-change-transform" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15 text-red-300"><AlertTriangle className="h-6 w-6" /></div>
        <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-400">{message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onCancel} className="rounded-full px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="rounded-full border border-red-500/50 bg-red-500/10 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50">
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
