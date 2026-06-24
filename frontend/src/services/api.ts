import axios from 'axios';

// Cliente Axios central. En dev usa el proxy de Vite (/api -> :4000).
export const api = axios.create({
  baseURL: '/api',
});

// Interceptor: adjunta el token JWT en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rcb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta: si 401, limpia sesión y redirige a login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !location.pathname.includes('/login')) {
      localStorage.removeItem('rcb_token');
      localStorage.removeItem('rcb_user');
      if (location.pathname.startsWith('/admin')) {
        location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Extrae un mensaje de error legible de una respuesta de Axios
export function getApiError(err: unknown, fallback = 'Ocurrió un error'): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || err.message || fallback;
  }
  return fallback;
}
