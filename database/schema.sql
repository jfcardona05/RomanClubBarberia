-- ============================================================
--  Roman Club Barbería - Esquema de base de datos (MySQL puro)
--  Charset utf8mb4 para soportar acentos y la "Ñ" (categoría UÑAS)
-- ============================================================

CREATE DATABASE IF NOT EXISTS roman_club_barberia
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE roman_club_barberia;

-- Eliminar tablas en orden inverso de dependencias (para reinstalar limpio)
DROP TABLE IF EXISTS servicios_realizados;
DROP TABLE IF EXISTS inventario_movimientos;
DROP TABLE IF EXISTS inventario_productos;
DROP TABLE IF EXISTS cita_servicios;
DROP TABLE IF EXISTS citas;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS empleado_servicios;
DROP TABLE IF EXISTS servicios;
DROP TABLE IF EXISTS empleados_perfiles;
DROP TABLE IF EXISTS galeria;
DROP TABLE IF EXISTS configuracion_sitio;
DROP TABLE IF EXISTS usuarios;

-- ============================================================
--  USUARIOS  (dueño/admin y empleados que inician sesión)
-- ============================================================
CREATE TABLE usuarios (
  id_usuario        INT AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(120)  NOT NULL,
  email             VARCHAR(160)  NOT NULL UNIQUE,
  password_hash     VARCHAR(255)  NOT NULL,
  telefono          VARCHAR(40)   DEFAULT NULL,
  rol               ENUM('ADMIN','EMPLEADO') NOT NULL DEFAULT 'EMPLEADO',
  estado            ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  fecha_creacion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_rol (rol),
  INDEX idx_usuarios_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  EMPLEADOS_PERFILES  (datos extra de cada empleado)
-- ============================================================
CREATE TABLE empleados_perfiles (
  id_perfil       INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario      INT NOT NULL,
  especialidad    ENUM('BARBERO','MANICURISTA','OTRO') NOT NULL DEFAULT 'OTRO',
  bio             TEXT DEFAULT NULL,
  foto_url        VARCHAR(255) DEFAULT NULL,
  hora_apertura   TIME NOT NULL DEFAULT '09:00:00',
  hora_cierre     TIME NOT NULL DEFAULT '20:00:00',
  puede_completar_citas TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_perfil_usuario (id_usuario),
  CONSTRAINT fk_perfil_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  SERVICIOS
-- ============================================================
CREATE TABLE servicios (
  id_servicio      INT AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(120) NOT NULL,
  descripcion      TEXT DEFAULT NULL,
  categoria        ENUM('BARBERIA','UÑAS','OTRO') NOT NULL DEFAULT 'BARBERIA',
  precio           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duracion_minutos INT NOT NULL DEFAULT 30,
  imagen_url       VARCHAR(255) DEFAULT NULL,
  activo           TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_servicios_categoria (categoria),
  INDEX idx_servicios_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  EMPLEADO_SERVICIOS  (relación N:M servicios <-> empleados)
-- ============================================================
CREATE TABLE empleado_servicios (
  id_usuario   INT NOT NULL,
  id_servicio  INT NOT NULL,
  PRIMARY KEY (id_usuario, id_servicio),
  CONSTRAINT fk_es_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_es_servicio FOREIGN KEY (id_servicio)
    REFERENCES servicios(id_servicio) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  CLIENTES  (registro de clientes, identificados por documento)
-- ============================================================
CREATE TABLE clientes (
  id_cliente     INT AUTO_INCREMENT PRIMARY KEY,
  documento      VARCHAR(40)  NOT NULL UNIQUE,
  nombre         VARCHAR(120) NOT NULL,
  telefono       VARCHAR(40)  DEFAULT NULL,
  email          VARCHAR(160) DEFAULT NULL,
  notas          TEXT DEFAULT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  CITAS
-- ============================================================
CREATE TABLE citas (
  id_cita              INT AUTO_INCREMENT PRIMARY KEY,
  id_cliente           INT DEFAULT NULL,
  documento_cliente    VARCHAR(40) DEFAULT NULL,
  nombre_cliente       VARCHAR(120) NOT NULL,
  telefono_cliente     VARCHAR(40)  NOT NULL,
  id_servicio          INT DEFAULT NULL,
  id_empleado          INT DEFAULT NULL,
  fecha                DATE NOT NULL,
  hora_inicio          TIME NOT NULL,
  hora_fin             TIME DEFAULT NULL,
  estado               ENUM('PENDIENTE','COMPLETADA','CANCELADA')
                         NOT NULL DEFAULT 'PENDIENTE',
  comentarios_cliente  TEXT DEFAULT NULL,
  observaciones_internas TEXT DEFAULT NULL,
  precio_estimado      DECIMAL(10,2) DEFAULT NULL,
  precio_final         DECIMAL(10,2) DEFAULT NULL,
  confirmacion_enviada     TINYINT(1) NOT NULL DEFAULT 0,
  recordatorio_1h_enviado  TINYINT(1) NOT NULL DEFAULT 0,
  recordatorio_20m_enviado TINYINT(1) NOT NULL DEFAULT 0,
  -- Pago (independiente del estado de atención)
  monto_total          DECIMAL(10,2) DEFAULT NULL,
  monto_pagado         DECIMAL(10,2) NOT NULL DEFAULT 0,
  tipo_pago            ENUM('NINGUNO','ABONO','TOTAL') NOT NULL DEFAULT 'NINGUNO',
  estado_pago          ENUM('NO_APLICA','PENDIENTE','ABONADO','PAGADO','FALLIDO') NOT NULL DEFAULT 'NO_APLICA',
  referencia_pago      VARCHAR(80) DEFAULT NULL,
  transaccion_id       VARCHAR(80) DEFAULT NULL,
  creado_por           ENUM('CLIENTE','ADMIN','EMPLEADO') NOT NULL DEFAULT 'CLIENTE',
  fecha_creacion       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cita_servicio FOREIGN KEY (id_servicio)
    REFERENCES servicios(id_servicio) ON DELETE SET NULL,
  CONSTRAINT fk_cita_empleado FOREIGN KEY (id_empleado)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  CONSTRAINT fk_cita_cliente FOREIGN KEY (id_cliente)
    REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  INDEX idx_citas_fecha (fecha),
  INDEX idx_citas_estado (estado),
  INDEX idx_citas_empleado (id_empleado),
  INDEX idx_citas_cliente (id_cliente),
  INDEX idx_citas_empleado_fecha (id_empleado, fecha, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  CITA_SERVICIOS  (una cita puede tener varios servicios)
-- ============================================================
CREATE TABLE cita_servicios (
  id_cita          INT NOT NULL,
  id_servicio      INT NOT NULL,
  precio           DECIMAL(10,2) NOT NULL DEFAULT 0,
  duracion_minutos INT NOT NULL DEFAULT 30,
  PRIMARY KEY (id_cita, id_servicio),
  CONSTRAINT fk_cs_cita FOREIGN KEY (id_cita)
    REFERENCES citas(id_cita) ON DELETE CASCADE,
  CONSTRAINT fk_cs_servicio FOREIGN KEY (id_servicio)
    REFERENCES servicios(id_servicio) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  RESERVAS_PENDIENTES  (reserva en espera de pago; la cita se
--  crea SOLO cuando el pago es aprobado)
-- ============================================================
CREATE TABLE reservas_pendientes (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  referencia     VARCHAR(80) NOT NULL UNIQUE,
  datos          LONGTEXT NOT NULL,
  monto          DECIMAL(10,2) NOT NULL,
  monto_total    DECIMAL(10,2) NOT NULL,
  tipo_pago      ENUM('ABONO','TOTAL') NOT NULL,
  estado         ENUM('PENDIENTE','PAGADA','FALLIDA') NOT NULL DEFAULT 'PENDIENTE',
  transaccion_id VARCHAR(80) DEFAULT NULL,
  id_cita        INT DEFAULT NULL,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  GALERIA
-- ============================================================
CREATE TABLE galeria (
  id_imagen      INT AUTO_INCREMENT PRIMARY KEY,
  titulo         VARCHAR(150) DEFAULT NULL,
  descripcion    TEXT DEFAULT NULL,
  imagen_url     VARCHAR(255) NOT NULL,
  categoria      ENUM('CORTES','BARBA','UÑAS','LOCAL','DESTACADOS','OTRO')
                   NOT NULL DEFAULT 'OTRO',
  destacada      TINYINT(1) NOT NULL DEFAULT 0,
  orden          INT NOT NULL DEFAULT 0,
  activa         TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_galeria_destacada (destacada),
  INDEX idx_galeria_activa (activa),
  INDEX idx_galeria_categoria (categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  CONFIGURACION_SITIO  (clave/valor para contenido editable)
-- ============================================================
CREATE TABLE configuracion_sitio (
  id_config      INT AUTO_INCREMENT PRIMARY KEY,
  clave          VARCHAR(80)  NOT NULL UNIQUE,
  valor          TEXT DEFAULT NULL,
  tipo           ENUM('TEXTO','TEXTO_LARGO','URL','IMAGEN','COLOR','TELEFONO','EMAIL')
                   NOT NULL DEFAULT 'TEXTO',
  fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  INVENTARIO_PRODUCTOS
-- ============================================================
CREATE TABLE inventario_productos (
  id_producto    INT AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  categoria      ENUM('BARBERIA','UÑAS','LIMPIEZA','HERRAMIENTA','VENTA','OTRO')
                   NOT NULL DEFAULT 'OTRO',
  descripcion    TEXT DEFAULT NULL,
  stock_actual   DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_minimo   DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad         VARCHAR(30) NOT NULL DEFAULT 'unidad',
  costo_unitario DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_venta   DECIMAL(10,2) DEFAULT NULL,
  proveedor      VARCHAR(150) DEFAULT NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inv_categoria (categoria),
  INDEX idx_inv_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  INVENTARIO_MOVIMIENTOS
-- ============================================================
CREATE TABLE inventario_movimientos (
  id_movimiento   INT AUTO_INCREMENT PRIMARY KEY,
  id_producto     INT NOT NULL,
  id_usuario      INT DEFAULT NULL,
  tipo_movimiento ENUM('ENTRADA','SALIDA','AJUSTE','USO_EN_SERVICIO') NOT NULL,
  cantidad        DECIMAL(10,2) NOT NULL,
  motivo          VARCHAR(200) DEFAULT NULL,
  observaciones   TEXT DEFAULT NULL,
  fecha_movimiento TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_producto FOREIGN KEY (id_producto)
    REFERENCES inventario_productos(id_producto) ON DELETE CASCADE,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_mov_producto (id_producto),
  INDEX idx_mov_fecha (fecha_movimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  SERVICIOS_REALIZADOS  (se crea al COMPLETAR una cita)
-- ============================================================
CREATE TABLE servicios_realizados (
  id_servicio_realizado INT AUTO_INCREMENT PRIMARY KEY,
  id_cita          INT DEFAULT NULL,
  id_servicio      INT DEFAULT NULL,
  id_empleado      INT DEFAULT NULL,
  nombre_cliente   VARCHAR(120) DEFAULT NULL,
  telefono_cliente VARCHAR(40)  DEFAULT NULL,
  precio_cobrado   DECIMAL(10,2) NOT NULL DEFAULT 0,
  metodo_pago      ENUM('EFECTIVO','TRANSFERENCIA','NEQUI','DAVIPLATA','TARJETA','OTRO')
                     NOT NULL DEFAULT 'EFECTIVO',
  fecha_realizado  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  observaciones    TEXT DEFAULT NULL,
  CONSTRAINT fk_sr_cita FOREIGN KEY (id_cita)
    REFERENCES citas(id_cita) ON DELETE SET NULL,
  CONSTRAINT fk_sr_servicio FOREIGN KEY (id_servicio)
    REFERENCES servicios(id_servicio) ON DELETE SET NULL,
  CONSTRAINT fk_sr_empleado FOREIGN KEY (id_empleado)
    REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  INDEX idx_sr_fecha (fecha_realizado),
  INDEX idx_sr_empleado (id_empleado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
