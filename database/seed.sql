-- ============================================================
--  Roman Club Barbería - Datos iniciales (seed)
--  Ejecutar DESPUÉS de schema.sql
--
--  Credenciales de acceso al panel:
--    ADMIN    -> email: admin@romanclub.com      pass: admin123
--    EMPLEADA -> email: manicurista@romanclub.com pass: empleada123
-- ============================================================

USE roman_club_barberia;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE servicios_realizados;
TRUNCATE TABLE inventario_movimientos;
TRUNCATE TABLE inventario_productos;
TRUNCATE TABLE cita_servicios;
TRUNCATE TABLE citas;
TRUNCATE TABLE clientes;
TRUNCATE TABLE empleado_servicios;
TRUNCATE TABLE servicios;
TRUNCATE TABLE empleados_perfiles;
TRUNCATE TABLE galeria;
TRUNCATE TABLE configuracion_sitio;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- USUARIOS ----------
-- Hashes bcrypt reales (cost 10) generados para admin123 / empleada123
INSERT INTO usuarios (id_usuario, nombre, email, password_hash, telefono, rol, estado) VALUES
(1, 'Román (Dueño)', 'admin@romanclub.com', '$2b$10$QUjF1j4ewcnlc1OdZc8z/OLopOOvEdvoawRV7vhTCO0wHd1lWo3NS', '+57 320 0000000', 'ADMIN', 'ACTIVO'),
(2, 'Laura (Manicurista)', 'manicurista@romanclub.com', '$2b$10$bV.XPnzr1iiS9CrcA8vpFOW5I5hEU9dFFNjQMgHqC./p255Sc1MPS', '+57 320 1111111', 'EMPLEADO', 'ACTIVO');

INSERT INTO empleados_perfiles (id_usuario, especialidad, bio, puede_completar_citas) VALUES
(1, 'BARBERO', 'Barbero principal y dueño de Roman Club Barbería. Especialista en cortes clásicos, degradados y arreglo de barba.', 1),
(2, 'MANICURISTA', 'Manicurista profesional. Uñas semipermanentes, diseños y cuidado de manos.', 1);

-- ---------- SERVICIOS ----------
INSERT INTO servicios (id_servicio, nombre, descripcion, categoria, precio, duracion_minutos, activo) VALUES
(1, 'Corte clásico', 'Corte tradicional a tijera y máquina, lavado y peinado.', 'BARBERIA', 20000, 30, 1),
(2, 'Corte degradado (Fade)', 'Degradado profesional a tu estilo, perfilado y acabado premium.', 'BARBERIA', 25000, 40, 1),
(3, 'Arreglo de barba', 'Perfilado, recorte y toalla caliente con productos premium.', 'BARBERIA', 15000, 25, 1),
(4, 'Corte + Barba', 'Combo completo: corte a tu medida y arreglo de barba.', 'BARBERIA', 35000, 55, 1),
(5, 'Cejas', 'Perfilado de cejas para hombre.', 'BARBERIA', 8000, 15, 1),
(6, 'Manicure clásico', 'Limado, cutícula, hidratación y esmalte tradicional.', 'UÑAS', 25000, 45, 1),
(7, 'Uñas semipermanentes', 'Esmaltado semipermanente de larga duración.', 'UÑAS', 40000, 60, 1),
(8, 'Diseño de uñas', 'Diseños personalizados y decoración.', 'UÑAS', 50000, 75, 1);

-- ---------- EMPLEADO_SERVICIOS ----------
-- Román (1) ofrece barbería; Laura (2) ofrece uñas
INSERT INTO empleado_servicios (id_usuario, id_servicio) VALUES
(1,1),(1,2),(1,3),(1,4),(1,5),
(2,6),(2,7),(2,8);

-- ---------- CONFIGURACION DEL SITIO ----------
INSERT INTO configuracion_sitio (clave, valor, tipo) VALUES
('nombre_negocio', 'Roman Club Barbería', 'TEXTO'),
('slogan', 'Estilo, presencia y actitud', 'TEXTO'),
('descripcion', 'Barbería premium en Villavicencio. Cortes, barba y uñas con un servicio de primer nivel.', 'TEXTO_LARGO'),
('hero_titulo', 'Luce como un Rey', 'TEXTO'),
('hero_subtitulo', 'Barbería premium en Villavicencio. Reserva tu cita y vive la experiencia Roman Club.', 'TEXTO_LARGO'),
('hero_imagen', '/img/NiggaBarber.png', 'IMAGEN'),
('cta_principal', 'Reservar cita', 'TEXTO'),
('cta_secundario', 'Ver servicios', 'TEXTO'),
('telefono', '+57 320 0000000', 'TELEFONO'),
('whatsapp', '573200000000', 'TELEFONO'),
('email', 'contacto@romanclub.com', 'EMAIL'),
('direccion', 'Calle 16 No 40A 35, Villa María, Villavicencio, Colombia', 'TEXTO'),
('google_maps_url', 'https://www.google.com/maps?q=Calle+16+No+40A+35+Villa+Maria+Villavicencio', 'URL'),
('instagram', 'https://instagram.com/romanclubbarberia', 'URL'),
('facebook', 'https://facebook.com/romanclubbarberia', 'URL'),
('tiktok', 'https://tiktok.com/@romanclubbarberia', 'URL'),
('horario_semana', 'Lunes a Viernes: 9:00 a.m. - 8:00 p.m.', 'TEXTO'),
('horario_sabado', 'Sábados: 9:00 a.m. - 9:00 p.m.', 'TEXTO'),
('horario_domingo', 'Domingos: 10:00 a.m. - 4:00 p.m.', 'TEXTO'),
('color_primario', '#0a0a0f', 'COLOR'),
('color_dorado', '#c9a24b', 'COLOR');

-- ---------- GALERIA ----------
-- Las imágenes apuntan a /img/ (servidas por el frontend desde /public/img).
-- Reemplázalas subiendo fotos reales desde el panel de administración.
INSERT INTO galeria (titulo, descripcion, imagen_url, categoria, destacada, orden, activa) VALUES
('Nuestro estilo', 'Trabajo destacado de la barbería', '/img/NiggaBarber.png', 'DESTACADOS', 1, 1, 1),
('El local', 'Ambiente Roman Club Barbería', '/img/Barberia.png', 'LOCAL', 1, 2, 1),
('Identidad', 'Roman Club Barbería', '/img/logo.png', 'DESTACADOS', 0, 3, 1);

-- ---------- INVENTARIO (productos de ejemplo) ----------
INSERT INTO inventario_productos
  (nombre, categoria, descripcion, stock_actual, stock_minimo, unidad, costo_unitario, precio_venta, proveedor, activo) VALUES
('Cera para cabello', 'BARBERIA', 'Cera mate fijación fuerte', 10, 3, 'unidad', 12000, 25000, 'Distribuidora Capital', 1),
('Aceite para barba', 'BARBERIA', 'Aceite hidratante para barba', 6, 2, 'botella', 15000, 30000, 'Distribuidora Capital', 1),
('Cuchillas de afeitar', 'HERRAMIENTA', 'Caja de 10 cuchillas', 2, 5, 'caja', 8000, NULL, 'Insumos Pro', 1),
('Esmalte semipermanente', 'UÑAS', 'Esmalte gel UV varios colores', 20, 5, 'unidad', 9000, NULL, 'Nails Supply', 1),
('Alcohol antiséptico', 'LIMPIEZA', 'Alcohol 70% 1L', 4, 2, 'botella', 6000, NULL, 'Insumos Pro', 1);

-- Movimiento inicial de ejemplo (entrada de stock)
INSERT INTO inventario_movimientos (id_producto, id_usuario, tipo_movimiento, cantidad, motivo) VALUES
(1, 1, 'ENTRADA', 10, 'Compra inicial de insumos');

-- ---------- CLIENTES DE EJEMPLO ----------
INSERT INTO clientes (id_cliente, documento, nombre, telefono, email) VALUES
(1, '1121800001', 'Carlos Pérez', '+57 311 2223344', NULL),
(2, '1121800002', 'Andrés Gómez', '+57 312 5566778', NULL),
(3, '1121800003', 'María López', '+57 313 9988776', 'maria@example.com');

-- ---------- CITAS DE EJEMPLO (ya confirmadas) ----------
INSERT INTO citas
  (id_cliente, documento_cliente, nombre_cliente, telefono_cliente, id_servicio, id_empleado, fecha, hora_inicio, hora_fin, estado, comentarios_cliente, precio_estimado, creado_por) VALUES
(1, '1121800001', 'Carlos Pérez', '+57 311 2223344', 4, 1, CURDATE(), '15:00:00', '15:55:00', 'PENDIENTE', 'Degradado bajo, por favor.', 35000, 'CLIENTE'),
(2, '1121800002', 'Andrés Gómez', '+57 312 5566778', 2, 1, CURDATE(), '17:00:00', '17:40:00', 'PENDIENTE', NULL, 25000, 'CLIENTE'),
(3, '1121800003', 'María López', '+57 313 9988776', 7, 2, CURDATE(), '14:00:00', '15:00:00', 'PENDIENTE', 'Color nude.', 40000, 'CLIENTE');

-- Servicios de cada cita (multi-servicio)
INSERT INTO cita_servicios (id_cita, id_servicio, precio, duracion_minutos) VALUES
(1, 4, 35000, 55),
(2, 2, 25000, 40),
(3, 7, 40000, 60);
