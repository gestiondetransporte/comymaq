

## Problem

The "Estado" column in the main inventory table (line 444) uses `getDisponibilidadBadge(equipo.contrato_activo)` which only checks if there's an active contract — showing either "RENTADO" or "DISPONIBLE". It completely ignores the actual `estado` field from the database (`equipo.estado`), which is the field updated by all the automated workflows (TALLER, TALLER EXTERNO, DENTRO, BAJA, etc.).

## Solution

Replace `getDisponibilidadBadge` to use `equipo.estado` as the primary source, falling back to contract status only when `estado` is null.

### Changes in `src/pages/Inventario.tsx`:

1. **Update `getDisponibilidadBadge`** to accept the equipment object and display based on `equipo.estado`:
   - `TALLER` → orange badge
   - `TALLER EXTERNO` → purple badge  
   - `DENTRO` → blue badge
   - `DISPONIBLE` / `LIBRE` → green badge
   - `BAJA` → destructive/red badge
   - If `estado` is null, fall back to current logic (contract exists → RENTADO, else DISPONIBLE)

2. **Update the table cell** (line 444) to pass the full equipo object instead of just `contrato_activo`:
   ```
   <TableCell>{getDisponibilidadBadge(equipo)}</TableCell>
   ```

This ensures the Estado column always reflects the real database value set by the automated workflows.

