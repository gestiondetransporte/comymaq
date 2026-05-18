ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS altura_equipo numeric,
  ADD COLUMN IF NOT EXISTS capacidad_carga numeric;