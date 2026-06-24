// Tipos compartidos del dominio Roman Club Barbería

export type Rol = 'ADMIN' | 'EMPLEADO';
export type Estado = 'ACTIVO' | 'INACTIVO';
export type CategoriaServicio = 'BARBERIA' | 'UÑAS' | 'OTRO';
export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA' | 'COMPLETADA' | 'REAGENDADA';
export type Especialidad = 'BARBERO' | 'MANICURISTA' | 'OTRO';
export type CategoriaInventario = 'BARBERIA' | 'UÑAS' | 'LIMPIEZA' | 'HERRAMIENTA' | 'VENTA' | 'OTRO';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'USO_EN_SERVICIO';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'NEQUI' | 'DAVIPLATA' | 'TARJETA' | 'OTRO';
export type CategoriaGaleria = 'CORTES' | 'BARBA' | 'UÑAS' | 'LOCAL' | 'DESTACADOS' | 'OTRO';

export interface Usuario {
  id_usuario: number;
  id?: number; // alias devuelto por /auth/login y /auth/me
  nombre: string;
  email: string;
  telefono?: string | null;
  rol: Rol;
  estado?: Estado;
  especialidad?: Especialidad;
  bio?: string | null;
  foto_url?: string | null;
  hora_apertura?: string | null;
  hora_cierre?: string | null;
  puede_completar_citas?: number;
  servicios?: number[];
  fecha_creacion?: string;
}

export interface Servicio {
  id_servicio: number;
  nombre: string;
  descripcion?: string | null;
  categoria: CategoriaServicio;
  precio: number;
  duracion_minutos: number;
  imagen_url?: string | null;
  activo: number;
  profesionales?: { id_usuario: number; nombre: string; hora_apertura?: string | null; hora_cierre?: string | null }[];
}

export interface Cliente {
  id_cliente: number;
  documento: string;
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  notas?: string | null;
  total_citas?: number;
  ultima_visita?: string | null;
  historial?: {
    id_cita: number; fecha: string; hora_inicio: string; estado: EstadoCita;
    precio_final?: number | null; precio_estimado?: number | null;
    servicio_nombre?: string | null; empleado_nombre?: string | null;
  }[];
}

export interface Cita {
  id_cita: number;
  id_cliente?: number | null;
  documento_cliente?: string | null;
  nombre_cliente: string;
  telefono_cliente: string;
  id_servicio?: number | null;
  servicios?: number[];
  servicios_nombres?: string | null;
  id_empleado?: number | null;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string | null;
  estado: EstadoCita;
  comentarios_cliente?: string | null;
  observaciones_internas?: string | null;
  precio_estimado?: number | null;
  precio_final?: number | null;
  monto_total?: number | null;
  monto_pagado?: number | null;
  tipo_pago?: 'NINGUNO' | 'ABONO' | 'TOTAL';
  estado_pago?: 'NO_APLICA' | 'PENDIENTE' | 'ABONADO' | 'PAGADO' | 'FALLIDO';
  creado_por: string;
  servicio_nombre?: string | null;
  servicio_categoria?: string | null;
  empleado_nombre?: string | null;
}

export interface ImagenGaleria {
  id_imagen: number;
  titulo?: string | null;
  descripcion?: string | null;
  imagen_url: string;
  categoria: CategoriaGaleria;
  destacada: number;
  orden: number;
  activa: number;
}

export interface Producto {
  id_producto: number;
  nombre: string;
  categoria: CategoriaInventario;
  descripcion?: string | null;
  stock_actual: number;
  stock_minimo: number;
  unidad: string;
  costo_unitario: number;
  precio_venta?: number | null;
  proveedor?: string | null;
  activo: number;
}

export interface Movimiento {
  id_movimiento: number;
  id_producto: number;
  producto_nombre?: string;
  unidad?: string;
  usuario_nombre?: string;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  motivo?: string | null;
  observaciones?: string | null;
  fecha_movimiento: string;
}

export type ConfigSitio = Record<string, string>;

export interface ResumenDashboard {
  citasHoy: Record<EstadoCita | 'total', number>;
  ingresoDia: number;
  ingresoMes: number;
  masVendidos: { nombre: string; cantidad: number; ingresos: number }[];
  proximas: Cita[];
  alertasInventario: { nombre: string; stock_actual: number; stock_minimo: number; unidad: string }[];
  resumenEmpleados: { id_usuario: number; nombre: string; servicios: number; ingresos: number }[];
}
