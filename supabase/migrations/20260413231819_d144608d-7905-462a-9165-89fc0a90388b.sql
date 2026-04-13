ALTER TABLE public.entradas_salidas
ADD COLUMN lleva_extintor boolean DEFAULT NULL,
ADD COLUMN odometro numeric DEFAULT NULL;