-- Add municipio and estado columns to contratos table
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS municipio TEXT,
ADD COLUMN IF NOT EXISTS estado_ubicacion TEXT;