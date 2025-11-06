-- Corregir funciones para tener search_path seguro
CREATE OR REPLACE FUNCTION generate_mantenimiento_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION set_mantenimiento_id_interno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id_interno IS NULL THEN
    NEW.id_interno := generate_mantenimiento_id();
  END IF;
  RETURN NEW;
END;
$$;