-- Create mantenimientos_archivos table to store inspection files
CREATE TABLE IF NOT EXISTS public.mantenimientos_archivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mantenimiento_id UUID NOT NULL,
  archivo_url TEXT NOT NULL,
  tipo_archivo TEXT NOT NULL CHECK (tipo_archivo IN ('imagen', 'video', 'documento')),
  nombre_archivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mantenimientos_archivos ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view archivos de mantenimientos"
ON public.mantenimientos_archivos
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert archivos de mantenimientos"
ON public.mantenimientos_archivos
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage archivos de mantenimientos"
ON public.mantenimientos_archivos
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));