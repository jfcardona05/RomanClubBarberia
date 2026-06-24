import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../services/AuthContext';
import { LoadingSpinner } from '../components/ui';

// Protege rutas del panel. Si requireAdmin, solo deja pasar ADMIN.
export function ProtectedRoute({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-ink"><LoadingSpinner /></div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (requireAdmin && user.rol !== 'ADMIN') return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
