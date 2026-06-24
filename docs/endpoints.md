# Endpoints — API Roman Club Barbería

Base URL: `http://localhost:4000/api`

Autenticación: header `Authorization: Bearer <token>` en rutas privadas.
Leyenda: 🌐 público · 🔒 logueado · 👑 solo ADMIN

## Auth
| Método | Ruta            | Acceso | Descripción                    |
|--------|-----------------|--------|--------------------------------|
| POST   | `/auth/login`   | 🌐     | Login, devuelve token + usuario|
| GET    | `/auth/me`      | 🔒     | Datos del usuario autenticado  |

## Usuarios / Empleados (👑)
| Método | Ruta                    | Descripción                       |
|--------|-------------------------|-----------------------------------|
| GET    | `/usuarios`             | Listar empleados                  |
| POST   | `/usuarios`             | Crear empleado (con login)        |
| GET    | `/usuarios/:id`         | Detalle + servicios asignados     |
| PUT    | `/usuarios/:id`         | Editar                            |
| PUT    | `/usuarios/:id/estado`  | Activar / inactivar               |
| DELETE | `/usuarios/:id`         | Eliminar                          |

## Servicios
| Método | Ruta                 | Acceso | Descripción                  |
|--------|----------------------|--------|------------------------------|
| GET    | `/servicios/public`  | 🌐     | Activos para la landing      |
| GET    | `/servicios`         | 🔒     | Todos (panel)                |
| POST   | `/servicios`         | 👑     | Crear (multipart `imagen`)   |
| PUT    | `/servicios/:id`     | 👑     | Editar                       |
| DELETE | `/servicios/:id`     | 👑     | Eliminar                     |

## Citas
| Método | Ruta                     | Acceso | Descripción                          |
|--------|--------------------------|--------|--------------------------------------|
| POST   | `/citas/public`          | 🌐     | Cliente solicita cita (PENDIENTE)    |
| GET    | `/citas`                 | 🔒     | ADMIN: todas · EMPLEADO: las suyas   |
| GET    | `/citas/:id`             | 🔒     | Detalle                              |
| POST   | `/citas`                 | 🔒     | Crear manual                         |
| PUT    | `/citas/:id`             | 👑     | Editar                               |
| PUT    | `/citas/:id/confirmar`   | 👑     | Confirmar (asigna profesional)       |
| PUT    | `/citas/:id/cancelar`    | 👑     | Cancelar                             |
| PUT    | `/citas/:id/reagendar`   | 👑     | Reagendar                            |
| PUT    | `/citas/:id/completar`   | 🔒     | Completar → crea servicio realizado  |
| DELETE | `/citas/:id`             | 👑     | Eliminar                             |

> Validación de choques: no se permiten dos citas activas del mismo profesional que se solapen (considera la duración del servicio). Las canceladas/completadas no bloquean horario.

## Galería
| Método | Ruta               | Acceso | Descripción                  |
|--------|--------------------|--------|------------------------------|
| GET    | `/galeria/public`  | 🌐     | Activas, destacadas primero  |
| GET    | `/galeria`         | 👑     | Todas                        |
| POST   | `/galeria`         | 👑     | Subir (multipart `imagen`)   |
| PUT    | `/galeria/:id`     | 👑     | Editar                       |
| DELETE | `/galeria/:id`     | 👑     | Eliminar                     |

## Configuración del sitio
| Método | Ruta                     | Acceso | Descripción                       |
|--------|--------------------------|--------|-----------------------------------|
| GET    | `/configuracion/public`  | 🌐     | Objeto `{clave: valor}`           |
| GET    | `/configuracion`         | 👑     | Filas completas                   |
| PUT    | `/configuracion`         | 👑     | Upsert (acepta `hero_imagen_file`)|

## Inventario
| Método | Ruta                          | Acceso | Descripción                 |
|--------|-------------------------------|--------|-----------------------------|
| GET    | `/inventario/productos`       | 🔒     | Listar productos            |
| POST   | `/inventario/productos`       | 👑     | Crear producto              |
| PUT    | `/inventario/productos/:id`   | 👑     | Editar producto             |
| DELETE | `/inventario/productos/:id`   | 👑     | Eliminar producto           |
| GET    | `/inventario/movimientos`     | 🔒     | Listar movimientos          |
| POST   | `/inventario/movimientos`     | 🔒     | Registrar movimiento (stock)|
| GET    | `/inventario/alertas`         | 🔒     | Productos con stock bajo    |

## Dashboard / Reportes
| Método | Ruta                    | Acceso | Descripción                          |
|--------|-------------------------|--------|--------------------------------------|
| GET    | `/dashboard/resumen`    | 🔒     | KPIs, próximas citas, alertas        |
| GET    | `/dashboard/reportes`   | 🔒     | Ingresos por día/mes/profesional     |

## Formato de respuesta
```json
{ "ok": true, "data": [...] }      // éxito
{ "ok": false, "message": "..." }  // error
```
