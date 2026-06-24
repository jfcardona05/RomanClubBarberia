import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api';
import type { Usuario } from '../types';

interface AuthState {
  user: Usuario | null;
  loading: boolean;
  login: (token: string, user: Usuario) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({} as AuthState);

// Guarda el usuario en estado y en localStorage para mantener todo sincronizado
function persist(u: Usuario | null, setUser: (u: Usuario | null) => void) {
  if (u) localStorage.setItem('rcb_user', JSON.stringify(u));
  setUser(u);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  // Trae los datos frescos del usuario desde el backend
  const refreshUser = async () => {
    try {
      const r = await api.get('/auth/me');
      persist(r.data.usuario, setUser);
    } catch { /* token inválido: lo maneja el interceptor */ }
  };

  // Al cargar, restaura sesión desde localStorage y valida con /auth/me
  useEffect(() => {
    const token = localStorage.getItem('rcb_token');
    const stored = localStorage.getItem('rcb_user');
    if (token && stored) {
      setUser(JSON.parse(stored));
      api.get('/auth/me')
        .then((r) => persist(r.data.usuario, setUser))
        .catch(() => {
          localStorage.removeItem('rcb_token');
          localStorage.removeItem('rcb_user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, u: Usuario) => {
    localStorage.setItem('rcb_token', token);
    localStorage.setItem('rcb_user', JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem('rcb_token');
    localStorage.removeItem('rcb_user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
