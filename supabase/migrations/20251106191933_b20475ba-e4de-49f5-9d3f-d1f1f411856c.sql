-- Agregar campos nuevos a la tabla mantenimientos
ALTER TABLE mantenimientos 
ADD COLUMN IF NOT EXISTS id_interno text,
ADD COLUMN IF NOT EXISTS tipo_negocio text,
ADD COLUMN IF NOT EXISTS snapshot_equipo jsonb;

-- Crear índices para mejorar rendimiento de filtros
CREATE INDEX IF NOT EXISTS idx_mantenimientos_id_interno ON mantenimientos(id_interno);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tipo_negocio ON mantenimientos(tipo_negocio);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tipo_servicio ON mantenimientos(tipo_servicio);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tecnico ON mantenimientos(tecnico);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos(fecha);

-- Función para generar ID interno automático
CREATE OR REPLACE FUNCTION generate_mantenimiento_id()
RETURNS TEXT AS $$
DECLARE
  fecha_str TEXT;
  contador INT;
  nuevo_id TEXT;
BEGIN
  -- Obtener fecha en formato YYYYMMDD
  fecha_str := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  
  -- Contar mantenimientos del día actual
  SELECT COUNT(*) INTO contador
  FROM mantenimientos
  WHERE fecha = CURRENT_DATE;
  
  -- Generar ID con formato MNT-YYYYMMDD-XXX
  nuevo_id := 'MNT-' || fecha_str || '-' || LPAD((contador + 1)::TEXT, 3, '0');
  
  RETURN nuevo_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar ID interno automáticamente antes de insertar
CREATE OR REPLACE FUNCTION set_mantenimiento_id_interno()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_interno IS NULL THEN
    NEW.id_interno := generate_mantenimiento_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_mantenimiento_id_interno ON mantenimientos;
CREATE TRIGGER trigger_set_mantenimiento_id_interno
  BEFORE INSERT ON mantenimientos
  FOR EACH ROW
  EXECUTE FUNCTION set_mantenimiento_id_interno();