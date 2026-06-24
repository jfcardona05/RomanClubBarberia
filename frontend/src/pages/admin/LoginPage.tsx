import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../services';
import { getApiError } from '../../services/api';
import { useAuth } from '../../services/AuthContext';
import { Button, Input } from '../../components/ui';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      login(data.token, data.usuario);
      navigate('/admin');
    } catch (err) {
      setError(getApiError(err, 'No se pudo iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-4">
      <div className="absolute inset-0 bg-ink-radial opacity-70" />
      <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/img/logo.png" alt="Roman Club" className="mx-auto h-24 w-24 rounded-full ring-2 ring-gold/40" />
          <h1 className="mt-4 font-display text-2xl font-bold text-white">Roman Club Barbería</h1>
          <p className="text-sm text-gold">Panel administrativo</p>
        </div>

        <form onSubmit={submit} className="card-dark space-y-5 p-8">
          {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
          <Input label="Correo electrónico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@romanclub.com" autoFocus />
          <Input label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          <Button type="submit" loading={loading} className="w-full text-base">Ingresar</Button>
          <a href="/" className="block text-center text-xs text-gray-500 hover:text-gold">← Volver al sitio</a>
        </form>
      </div>
    </div>
  );
}
