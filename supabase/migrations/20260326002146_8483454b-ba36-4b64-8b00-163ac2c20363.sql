
ALTER TABLE cotizaciones ADD COLUMN folio_cotizacion TEXT;

CREATE OR REPLACE FUNCTION public.generate_cotizacion_folio()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.set_cotizacion_folio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.folio_cotizacion IS NULL THEN
    NEW.folio_cotizacion := generate_cotizacion_folio();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_cotizacion_folio
BEFORE INSERT ON cotizaciones
FOR EACH ROW EXECUTE FUNCTION set_cotizacion_folio();
