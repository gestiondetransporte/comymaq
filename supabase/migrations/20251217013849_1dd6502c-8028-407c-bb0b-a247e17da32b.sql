
-- Add status and prospecto fields to cotizaciones
ALTER TABLE cotizaciones 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendiente',
ADD COLUMN IF NOT EXISTS es_prospecto boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES contratos(id);

-- Add folio sequence for contratos (auto-increment)
CREATE SEQUENCE IF NOT EXISTS contratos_folio_seq START 1;

-- Create function to generate next contrato folio
CREATE OR REPLACE FUNCTION generate_contrato_folio()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_str TEXT;
  next_num INT;
  new_folio TEXT;
BEGIN
  year_str := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(folio_contrato FROM '[0-9]+$') AS INTEGER)), 0) + 1 
  INTO next_num
  FROM contratos 
  WHERE folio_contrato LIKE 'CTR-' || year_str || '-%';
  
  new_folio := 'CTR-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
  
  RETURN new_folio;
END;
$$;

-- Add tipo field to clientes (cliente vs prospecto)
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'cliente';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cotizaciones_status ON cotizaciones(status);
CREATE INDEX IF NOT EXISTS idx_clientes_tipo ON clientes(tipo);
