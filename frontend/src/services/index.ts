import { api } from './api';
import type {
  Usuario, Servicio, Cita, Cliente, ImagenGaleria, Producto, Movimiento, ConfigSitio, ResumenDashboard,
} from '../types';

// ---------- AUTH ----------
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.usuario as Usuario),
};

// ---------- SERVICIOS ----------
export const serviciosApi = {
  publicos: () => api.get('/servicios/public').then((r) => r.data.data as Servicio[]),
  listar: () => api.get('/servicios').then((r) => r.data.data as Servicio[]),
  crear: (data: FormData) => api.post('/servicios', data).then((r) => r.data),
  actualizar: (id: number, data: FormData) => api.put(`/servicios/${id}`, data).then((r) => r.data),
  eliminar: (id: number) => api.delete(`/servicios/${id}`).then((r) => r.data),
};

// ---------- CITAS ----------
export const citasApi = {
  crearPublic: (data: Partial<Cita>) => api.post('/citas/public', data).then((r) => r.data),
  disponibilidad: (params: { id_empleado?: number; fecha?: string; desde?: string; hasta?: string }) =>
    api.get('/citas/disponibilidad', { params }).then((r) => r.data.data as { fecha: string; hora_inicio: string; hora_fin: string }[]),
  listar: (params?: Record<string, string>) =>
    api.get('/citas', { params }).then((r) => r.data.data as Cita[]),
  obtener: (id: number) => api.get(`/citas/${id}`).then((r) => r.data.data as Cita),
  crear: (data: Partial<Cita>) => api.post('/citas', data).then((r) => r.data),
  actualizar: (id: number, data: Partial<Cita>) => api.put(`/citas/${id}`, data).then((r) => r.data),
  confirmar: (id: number, id_empleado?: number) =>
    api.put(`/citas/${id}/confirmar`, { id_empleado }).then((r) => r.data),
  cancelar: (id: number, observaciones_internas?: string) =>
    api.put(`/citas/${id}/cancelar`, { observaciones_internas }).then((r) => r.data),
  reagendar: (id: number, data: { fecha: string; hora_inicio: string; id_empleado?: number }) =>
    api.put(`/citas/${id}/reagendar`, data).then((r) => r.data),
  completar: (id: number, data: { precio_final?: number; metodo_pago?: string; observaciones?: string }) =>
    api.put(`/citas/${id}/completar`, data).then((r) => r.data),
  eliminar: (id: number) => api.delete(`/citas/${id}`).then((r) => r.data),
};

// ---------- CLIENTES ----------
export const clientesApi = {
  listar: (q?: string) => api.get('/clientes', { params: q ? { q } : {} }).then((r) => r.data.data as Cliente[]),
  obtener: (id: number) => api.get(`/clientes/${id}`).then((r) => r.data.data as Cliente),
  buscarPublic: (documento: string) =>
    api.get(`/clientes/public/${encodeURIComponent(documento)}`).then((r) => r.data as { ok: boolean; existe: boolean; cliente?: { nombre: string; telefono: string } }),
  crear: (data: Partial<Cliente>) => api.post('/clientes', data).then((r) => r.data),
  actualizar: (id: number, data: Partial<Cliente>) => api.put(`/clientes/${id}`, data).then((r) => r.data),
  eliminar: (id: number) => api.delete(`/clientes/${id}`).then((r) => r.data),
};

// ---------- USUARIOS / EMPLEADOS ----------
export const usuariosApi = {
  equipoPublic: () => api.get('/usuarios/public/equipo').then((r) => r.data.data as Usuario[]),
  listar: () => api.get('/usuarios').then((r) => r.data.data as Usuario[]),
  obtener: (id: number) => api.get(`/usuarios/${id}`).then((r) => r.data.data as Usuario),
  crear: (data: FormData) => api.post('/usuarios', data).then((r) => r.data),
  actualizar: (id: number, data: FormData) => api.put(`/usuarios/${id}`, data).then((r) => r.data),
  cambiarEstado: (id: number, estado: string) =>
    api.put(`/usuarios/${id}/estado`, { estado }).then((r) => r.data),
  eliminar: (id: number) => api.delete(`/usuarios/${id}`).then((r) => r.data),
};

// ---------- GALERIA ----------
export const galeriaApi = {
  publicas: (categoria?: string) =>
    api.get('/galeria/public', { params: categoria ? { categoria } : {} }).then((r) => r.data.data as ImagenGaleria[]),
  listar: () => api.get('/galeria').then((r) => r.data.data as ImagenGaleria[]),
  crear: (data: FormData) => api.post('/galeria', data).then((r) => r.data),
  actualizar: (id: number, data: FormData) => api.put(`/galeria/${id}`, data).then((r) => r.data),
  eliminar: (id: number) => api.delete(`/galeria/${id}`).then((r) => r.data),
};

// ---------- CONFIGURACION ----------
export const configApi = {
  publica: () => api.get('/configuracion/public').then((r) => r.data.data as ConfigSitio),
  listar: () => api.get('/configuracion').then((r) => r.data.data),
  actualizar: (data: ConfigSitio | FormData) => api.put('/configuracion', data).then((r) => r.data),
};

// ---------- INVENTARIO ----------
export const inventarioApi = {
  productos: (params?: Record<string, string>) =>
    api.get('/inventario/productos', { params }).then((r) => r.data.data as Producto[]),
  crearProducto: (data: Partial<Producto>) => api.post('/inventario/productos', data).then((r) => r.data),
  actualizarProducto: (id: number, data: Partial<Producto>) =>
    api.put(`/inventario/productos/${id}`, data).then((r) => r.data),
  eliminarProducto: (id: number) => api.delete(`/inventario/productos/${id}`).then((r) => r.data),
  movimientos: (id_producto?: number) =>
    api.get('/inventario/movimientos', { params: id_producto ? { id_producto } : {} }).then((r) => r.data.data as Movimiento[]),
  crearMovimiento: (data: Partial<Movimiento>) => api.post('/inventario/movimientos', data).then((r) => r.data),
  alertas: () => api.get('/inventario/alertas').then((r) => r.data.data as Producto[]),
};

// ---------- WHATSAPP ----------
export const whatsappApi = {
  estado: () => api.get('/whatsapp/estado').then((r) => r.data as { ok: boolean; conectado: boolean; qr: string | null; iniciando: boolean }),
  reconectar: () => api.post('/whatsapp/reconectar').then((r) => r.data),
};

// ---------- DASHBOARD / REPORTES ----------
export const dashboardApi = {
  resumen: () => api.get('/dashboard/resumen').then((r) => r.data.data as ResumenDashboard),
  reportes: (params?: Record<string, string>) => api.get('/dashboard/reportes', { params }).then((r) => r.data.data),
};
