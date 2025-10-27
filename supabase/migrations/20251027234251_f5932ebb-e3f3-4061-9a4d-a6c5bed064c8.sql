-- Add damage tracking columns to entradas_salidas table
ALTER TABLE public.entradas_salidas 
ADD COLUMN tiene_danos boolean DEFAULT false,
ADD COLUMN descripcion_danos text;