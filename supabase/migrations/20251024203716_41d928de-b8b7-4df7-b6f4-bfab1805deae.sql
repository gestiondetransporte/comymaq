-- Add location fields to contratos table
ALTER TABLE public.contratos 
ADD COLUMN ubicacion_gps text,
ADD COLUMN direccion text;