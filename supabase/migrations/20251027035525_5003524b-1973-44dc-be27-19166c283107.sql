-- Create table for multiple files attached to entradas_salidas
CREATE TABLE public.entradas_salidas_archivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entrada_salida_id UUID NOT NULL,
  archivo_url TEXT NOT NULL,
  tipo_archivo TEXT NOT NULL, -- 'imagen' o 'documento'
  nombre_archivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for multiple files attached to equipos
CREATE TABLE public.equipos_archivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipo_id UUID NOT NULL,
  archivo_url TEXT NOT NULL,
  tipo_archivo TEXT NOT NULL, -- 'imagen' o 'documento'
  nombre_archivo TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entradas_salidas_archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos_archivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for entradas_salidas_archivos
CREATE POLICY "Authenticated users can view archivos de entradas_salidas"
ON public.entradas_salidas_archivos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert archivos de entradas_salidas"
ON public.entradas_salidas_archivos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage archivos de entradas_salidas"
ON public.entradas_salidas_archivos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for equipos_archivos
CREATE POLICY "Authenticated users can view archivos de equipos"
ON public.equipos_archivos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert archivos de equipos"
ON public.equipos_archivos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage archivos de equipos"
ON public.equipos_archivos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));