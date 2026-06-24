# 💈 Roman Club Barbería

Web pública + panel administrativo para gestionar una barbería premium en Villavicencio:
servicios, precios, galería, citas, empleados, inventario y reportes de ingresos.

**Stack:** React + Vite + TypeScript + Tailwind · Node.js + Express · MySQL (`mysql2/promise`) · JWT + bcrypt.

![Paleta](https://img.shields.io/badge/estilo-negro%20%2B%20dorado%20premium-c9a24b)

---

## 📦 Requisitos

- Node.js 18+ y npm
- MySQL 8+ (o MariaDB compatible)

## 🚀 Puesta en marcha

### 1. Base de datos

Crea la base y carga el esquema + datos de ejemplo:

```bash
# Desde la raíz del proyecto (usa tu usuario MySQL)
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

> El `schema.sql` ya crea la base `roman_club_barberia`. El `seed.sql` carga el admin, servicios, configuración, galería e inventario de ejemplo.

### 2. Backend

```bash
cd backend
npm install
# Revisa/edita backend/.env (copia de .env.example) con tus credenciales MySQL
npm run dev
```

API en **http://localhost:4000/api**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Web en **http://localhost:5173**
- Landing pública: `/`
- Panel admin: `/admin/login`

> Vite hace proxy de `/api` y `/uploads` al backend (puerto 4000), así que no hay problemas de CORS en desarrollo.

---

## 🔑 Credenciales de prueba

| Rol      | Email                          | Contraseña    |
|----------|--------------------------------|---------------|
| ADMIN    | `admin@romanclub.com`          | `admin123`    |
| EMPLEADO | `manicurista@romanclub.com`    | `empleada123` |

> Para generar un nuevo hash de contraseña: `cd backend && npm run hash -- miClave`

---

## 🗂️ Estructura

```
RomanClubBarberia/
├── frontend/   # React + Vite + TS + Tailwind (landing + panel)
├── backend/    # Express + MySQL + JWT
├── database/   # schema.sql + seed.sql
├── docs/       # arquitectura, endpoints, flujo del sistema
└── img/        # logo e imágenes originales
```

## ✨ Funcionalidades

**Landing pública**
- Hero premium, servicios, galería (con destacados), lista de precios filtrable.
- Formulario de citas sin necesidad de cuenta → queda `PENDIENTE`.
- Ubicación con mapa, horarios, redes sociales y WhatsApp.
- Todo el contenido es editable desde el panel.

**Panel administrativo (JWT)**
- **Dashboard:** citas del día, ingresos día/mes, más vendidos, próximas citas, alertas de stock.
- **Citas:** flujo completo de estados (confirmar, cancelar, reagendar, completar) con validación de choques.
- **Servicios, Empleados, Galería:** CRUD completo con subida de imágenes (solo ADMIN).
- **Inventario:** productos, movimientos (entrada/salida/ajuste/uso) y alertas de stock bajo.
- **Configuración del sitio:** edita textos, contacto, redes, horarios e imagen del hero.
- **Reportes:** ingresos por día/mes/profesional, servicios más vendidos e historial.
- **Roles:** `ADMIN` ve todo; `EMPLEADO` solo su información.

## 📚 Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md) — visión técnica y paleta.
- [`docs/endpoints.md`](docs/endpoints.md) — referencia de la API REST.
- [`docs/flujo-sistema.md`](docs/flujo-sistema.md) — flujos de citas e inventario.

---

© Roman Club Barbería · Villavicencio
