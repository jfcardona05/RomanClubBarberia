# Flujos del sistema

## 1. Flujo de citas

```
Cliente (landing)                Admin (panel)                  Sistema
─────────────────                ─────────────                  ───────
1. Elige servicio
2. Llena formulario
3. Envía  ───────────────────►  4. Ve cita PENDIENTE
   (estado PENDIENTE)               │
   "Te confirmaremos por           ├─ Confirmar ──► CONFIRMADA (asigna profesional)
    WhatsApp"                       ├─ Cancelar  ──► CANCELADA  (libera horario)
                                    └─ Reagendar ──► REAGENDADA (nueva fecha/hora)
                                       │
                                  5. Realiza el servicio
                                       │
                                  6. Completar ──► COMPLETADA
                                                   │
                                                   ▼
                                          7. Crea registro en
                                             servicios_realizados
                                             (profesional, precio, pago)
                                                   │
                                                   ▼
                                          8. Dashboard y reportes
                                             se actualizan
```

**Estados:** `PENDIENTE → CONFIRMADA → COMPLETADA`, con ramas `CANCELADA` y `REAGENDADA`.

**Anti-choques:** al confirmar/crear/reagendar se valida que el profesional no tenga otra cita activa que se solape (usando la duración del servicio). Citas `CANCELADA`/`COMPLETADA` no bloquean.

## 2. Flujo de inventario

```
1. Admin crea productos (stock inicial, stock mínimo, unidad, costo).
2. Compra insumos        → movimiento ENTRADA  (stock += cantidad)
3. Uso / venta / merma   → movimiento SALIDA / USO_EN_SERVICIO (stock -= cantidad)
4. Conteo físico         → movimiento AJUSTE   (stock = cantidad)
5. Si stock_actual <= stock_minimo → alerta en el dashboard ⚠️
```

Cada movimiento guarda producto, tipo, cantidad, motivo, usuario y fecha.

## 3. Roles y permisos

| Acción                         | ADMIN | EMPLEADO |
|--------------------------------|:-----:|:--------:|
| Dashboard                      |  ✅   | ✅ (propio) |
| Ver todas las citas            |  ✅   | ❌ (solo suyas) |
| Confirmar/cancelar/reagendar   |  ✅   | ❌ |
| Completar cita                 |  ✅   | ✅ (si tiene permiso) |
| Servicios / Empleados / Galería|  ✅   | ❌ |
| Inventario (ver/mover)         |  ✅   | ✅ |
| Inventario (crear/editar)      |  ✅   | ❌ |
| Configuración del sitio        |  ✅   | ❌ |
| Reportes                       |  ✅   | ✅ (propios) |

## 4. Servicios realizados → ingresos

Al **completar** una cita se inserta en `servicios_realizados`:
profesional, servicio, cliente, **precio cobrado real**, método de pago y fecha.
Esto alimenta:

- Ingresos del día y del mes (dashboard).
- Ingresos por día / mes / profesional (reportes).
- Servicios más vendidos.
- Historial completo de servicios.
