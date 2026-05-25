
## Objetivo

El campo **Estado** del equipo debe cambiarse únicamente:
1. **Automáticamente** por eventos del flujo de trabajo (contratos, entradas/salidas, recolecciones, inspecciones).
2. **Manualmente solo por un administrador** desde la ficha del equipo.

Unificar el catálogo de estados, agregar **CONTRATADO** y los dos estados de checklist (**CHECKLIST OK** / **CHECKLIST NO OK**).

---

## Catálogo único de estados (final)

| Estado | Cuándo se asigna (automático) |
|---|---|
| `DISPONIBLE` | Equipo nuevo en bodega listo para rentar |
| `CONTRATADO` | **NUEVO** — Se crea un contrato (desde Contratos o al convertir una Cotización), pero el equipo aún no sale de bodega |
| `DENTRO` | Se registra la **Salida a Renta** en Entradas/Salidas |
| `TALLER` | Entrada de equipo o Regreso de Renta (recolección completada) — esperando revisión |
| `CHECKLIST OK` | **NUEVO** — Taller revisó el equipo y está en buenas condiciones (listo para volver a DISPONIBLE) |
| `CHECKLIST NO OK` | **NUEVO** — Taller revisó y encontró fallas; requiere reparación |
| `TALLER EXTERNO` | Se registra Salida a Taller Externo |
| `BAJA` | Salida Venta o baja manual de admin |

Se eliminan los valores sueltos `LIBRE` y `en_inspeccion` que aparecen hoy en la UI. Todo se mostrará en mayúsculas y el código normalizará a minúsculas con guión bajo para guardar (`checklist_ok`, `checklist_no_ok`, `taller_externo`, etc.).

Flujo natural del estado en taller:
`TALLER` (pendiente de inspección) → al completar inspección → `CHECKLIST OK` o `CHECKLIST NO OK` → cuando se repara/aprueba → `DISPONIBLE` (admin o automático tras reparación).

---

## Cambios en el flujo automático

1. **Contratos** y **Cotizaciones (conversión a contrato)**: al crear contrato → `equipos.estado = 'contratado'` (hoy Cotizaciones pone `'dentro'`; se quita).
2. **Entradas/Salidas** (se conserva el mapeo actual):
   - `salida_renta` → `dentro`
   - `salida_venta` → `baja`
   - `salida_taller_externo` → `taller_externo`
   - `entrada_equipo` / `regreso_renta` → `taller`
3. **Recolecciones**: recolección completada → `taller` (ya lo hace).
4. **Inspección Taller** (`src/pages/InspeccionTaller.tsx`):
   - Resultado **OK** → `checklist_ok` (antes ponía `disponible` directo).
   - Resultado **NO OK** → `checklist_no_ok` (antes ponía `taller`).
   - El listado de equipos a inspeccionar incluirá `taller`, `checklist_no_ok` y `checklist_ok` (por si requiere re-inspección).
5. **Baja desde ficha de equipo**: solo admin (ya está).

---

## Cambios para bloquear edición manual

- **`src/components/EquipoDetailsDialog.tsx`**: el selector de Estado se renderiza:
  - **Admin**: `<Select>` editable con las 8 opciones del catálogo unificado.
  - **No admin**: solo lectura (Badge), con leyenda "Solo administradores pueden cambiar el estado manualmente".
- **`src/components/AgregarEquipoDialog.tsx`**: al crear un equipo nuevo, el estado se fija en `disponible` y se oculta el selector para usuarios no admin (admin puede elegir).
- En filtros existentes (Inventario, Inspección Taller, Cotizaciones para equipo "disponible") se reemplaza cualquier referencia a `'en_inspeccion'` por el nuevo catálogo y se considera `checklist_ok` como equivalente operativo a "listo para volver a disponible".

---

## Resumen de archivos a tocar

- `src/components/EquipoDetailsDialog.tsx` — selector condicional por rol + nuevas opciones (CONTRATADO, CHECKLIST OK, CHECKLIST NO OK).
- `src/components/AgregarEquipoDialog.tsx` — estado por defecto `disponible`, selector solo para admin.
- `src/pages/Contratos.tsx` — actualizar equipo a `contratado` al crear contrato.
- `src/pages/Cotizaciones.tsx` — al convertir cotización en contrato, poner `contratado` en vez de `dentro`.
- `src/pages/InspeccionTaller.tsx` — guardar `checklist_ok` / `checklist_no_ok`; ampliar filtro de equipos a inspeccionar.
- `src/components/ui` / lugares con badge de estado — agregar colores para los nuevos estados (CONTRATADO en azul, CHECKLIST OK en verde, CHECKLIST NO OK en rojo/ámbar).
- Memoria del proyecto: actualizar la regla central de transiciones para incluir los 3 nuevos estados.

No se requieren migraciones de base de datos (el campo `estado` es texto libre).
