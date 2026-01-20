-- Add location fields to cotizaciones table
ALTER TABLE public.cotizaciones
ADD COLUMN IF NOT EXISTS direccion text,
ADD COLUMN IF NOT EXISTS municipio text,
ADD COLUMN IF NOT EXISTS estado_ubicacion text,
ADD COLUMN IF NOT EXISTS ubicacion_gps text,
ADD COLUMN IF NOT EXISTS precio_total numeric,
ADD COLUMN IF NOT EXISTS seguro numeric,
ADD COLUMN IF NOT EXISTS otros_concepto text,
ADD COLUMN IF NOT EXISTS otros_monto numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tipo_renta text DEFAULT 'mensual';