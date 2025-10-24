-- Add missing columns to equipos table
ALTER TABLE public.equipos 
ADD COLUMN IF NOT EXISTS tipo_negocio text,
ADD COLUMN IF NOT EXISTS asegurado text,
ADD COLUMN IF NOT EXISTS proveedor text,
ADD COLUMN IF NOT EXISTS tipo text,
ADD COLUMN IF NOT EXISTS precio_lista numeric,
ADD COLUMN IF NOT EXISTS precio_real_cliente numeric,
ADD COLUMN IF NOT EXISTS costo_proveedor_usd numeric,
ADD COLUMN IF NOT EXISTS costo_proveedor_mxn numeric,
ADD COLUMN IF NOT EXISTS ganancia numeric,
ADD COLUMN IF NOT EXISTS estado text,
ADD COLUMN IF NOT EXISTS ubicacion_actual text;

-- Add indexes for common search fields
CREATE INDEX IF NOT EXISTS idx_equipos_tipo ON public.equipos(tipo);
CREATE INDEX IF NOT EXISTS idx_equipos_estado ON public.equipos(estado);
CREATE INDEX IF NOT EXISTS idx_equipos_marca ON public.equipos(marca);

COMMENT ON COLUMN public.equipos.tipo IS 'Tipo de equipo: ELECTRICA o COMBUSTIÓN';
COMMENT ON COLUMN public.equipos.estado IS 'Estado actual del equipo: DISPONIBLE, DENTRO, TALLER, etc.';