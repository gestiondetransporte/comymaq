-- Add two more columns for additional photos in entradas_salidas table
ALTER TABLE public.entradas_salidas 
ADD COLUMN IF NOT EXISTS fotografia_url_2 text,
ADD COLUMN IF NOT EXISTS fotografia_url_3 text;