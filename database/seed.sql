-- ============================================================
--  SEED · Roman Club Barbería
--  Solo el usuario administrador. Nada más.
--
--  Credenciales:
--    email:    nigga@barber.com
--    password: nigga123
--
--  Ejecutar DESPUÉS de schema.sql:
--    mysql -u root roman_club_barberia < seed.sql
-- ============================================================

USE roman_club_barberia;

SET NAMES utf8mb4;

-- Usuario administrador (password 'nigga123' con bcrypt, 10 rounds)
INSERT INTO usuarios (nombre, email, password_hash, rol, estado) VALUES
('Administrador', 'nigga@barber.com', '$2b$10$VCu0j3YrYhnzhR9DqhXaeOuwFUxTCeJhmFWS6DyGxJ3GpI2atKT2q', 'ADMIN', 'ACTIVO');
