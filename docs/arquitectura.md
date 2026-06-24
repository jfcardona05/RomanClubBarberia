# Arquitectura — Roman Club Barbería

Solución full-stack para gestionar una barbería: **landing pública** + **panel administrativo**.

## Stack

| Capa        | Tecnología                                            |
|-------------|-------------------------------------------------------|
| Frontend    | React 18 + Vite + TypeScript + Tailwind CSS           |
| Backend     | Node.js + Express (ESM)                                |
| Base datos  | MySQL puro (`mysql2/promise`, pool de conexiones)     |
| Auth        | JWT (`jsonwebtoken`) + contraseñas con `bcrypt`        |
| Subidas     | `multer` (imágenes en `/uploads`)                     |

## Estructura

```
RomanClubBarberia/
├── frontend/        # React + Vite + TS + Tailwind
│   └── src/
│       ├── components/   # UI reutilizable + secciones públicas
│       ├── layouts/      # PublicLayout, AdminLayout
│       ├── pages/        # public/ y admin/
│       ├── routes/       # ProtectedRoute
│       ├── services/     # axios + API + AuthContext
│       ├── types/        # tipos del dominio
│       └── utils/        # formato (COP, fechas, imágenes)
├── backend/         # Express + MySQL
│   └── src/
│       ├── config/db.js      # pool MySQL
│       ├── controllers/      # lógica por recurso
│       ├── middlewares/      # auth, role, upload, error
│       ├── routes/           # endpoints REST
│       ├── utils/            # jwt, ApiError, hash
│       └── uploads/          # imágenes subidas
├── database/        # schema.sql + seed.sql
└── docs/            # esta documentación
```

## Paleta visual

Tomada del **logo** (negro profundo + dorado metálico + blanco):

- `ink` `#0a0a0f` — fondo principal
- `gold` `#c9a24b` (light `#e8c878`, dark `#a67c2e`) — acentos premium
- Tipografías: **Playfair Display** (títulos) + **Poppins** (texto)

## Seguridad

- JWT en `localStorage` (`rcb_token`), interceptor Axios lo adjunta.
- Rutas privadas protegidas por `authRequired` + `requireRole`.
- `ADMIN` ve y gestiona todo; `EMPLEADO` solo su información (sus citas, sus reportes).
- Contraseñas siempre con hash bcrypt (cost 10); nunca se devuelven al cliente.

## Roles

- **ADMIN** (dueño): control total — servicios, empleados, citas, galería, inventario, configuración, reportes.
- **EMPLEADO**: dashboard propio, solo sus citas, puede completar citas (si tiene permiso), inventario y sus reportes.
