ALTER TABLE public.equipos DROP CONSTRAINT equipos_numero_equipo_key;
CREATE UNIQUE INDEX equipos_numero_equipo_unique_active ON public.equipos (numero_equipo) WHERE estado IS DISTINCT FROM 'BAJA';