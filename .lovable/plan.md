

## Plan: Agregar Folio a Cotizaciones

### Objetivo
Agregar un folio automático secuencial a cada cotización (similar al sistema de folios de contratos: `COT-2026-0001`).

### Cambios

**1. Migración de base de datos**
- Agregar columna `folio_cotizacion TEXT` a la tabla `cotizaciones`
- Crear función `generate_cotizacion_folio()` que genere folios con formato `COT-YYYY-XXXX`
- Crear trigger para asignar el folio automáticamente al insertar

**2. Actualizar `src/pages/Cotizaciones.tsx`**
- Agregar `folio_cotizacion` al query de `fetchHistorial` y a la interfaz `CotizacionHistorial`
- Mostrar columna "Folio" como primera columna en la tabla del historial
- Incluir el folio en el PDF generado

### Detalle técnico

SQL de migración:
```sql
ALTER TABLE cotizaciones ADD COLUMN folio_cotizacion TEXT;

CREATE OR REPLACE FUNCTION generate_cotizacion_folio()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT;
  next_num INT;
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(folio_cotizacion FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_num FROM cotizaciones
  WHERE folio_cotizacion LIKE 'COT-' || year_str || '-%';
  RETURN 'COT-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION set_cotizacion_folio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio_cotizacion IS NULL THEN
    NEW.folio_cotizacion := generate_cotizacion_folio();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_set_cotizacion_folio
BEFORE INSERT ON cotizaciones
FOR EACH ROW EXECUTE FUNCTION set_cotizacion_folio();
```

Cambios en la tabla del historial: agregar columna "Folio" antes de "Fecha", mostrando el valor `folio_cotizacion` con un badge.

