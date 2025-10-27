-- Add specific photo columns to entradas_salidas table
ALTER TABLE public.entradas_salidas
ADD COLUMN IF NOT EXISTS foto_odometro_url text,
ADD COLUMN IF NOT EXISTS foto_calca_url text,
ADD COLUMN IF NOT EXISTS foto_tablero_url text,
ADD COLUMN IF NOT EXISTS foto_cargador_url text,
ADD COLUMN IF NOT EXISTS foto_extintor_url text,
ADD COLUMN IF NOT EXISTS contrato_id uuid REFERENCES public.contratos(id);