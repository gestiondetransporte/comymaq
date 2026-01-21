-- Add folio_factura and motivo_baja to contratos table
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS folio_factura text,
ADD COLUMN IF NOT EXISTS motivo_baja text,
ADD COLUMN IF NOT EXISTS fecha_baja timestamp with time zone;

-- Create table for contract renewals history
CREATE TABLE public.contratos_renovaciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  fecha_renovacion timestamp with time zone NOT NULL DEFAULT now(),
  fecha_inicio_anterior date,
  fecha_vencimiento_anterior date,
  fecha_inicio_nueva date NOT NULL,
  fecha_vencimiento_nueva date NOT NULL,
  dias_contratado_nuevo integer,
  suma_nueva numeric,
  folio_factura text,
  comentarios text,
  usuario_id uuid,
  usuario_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on contratos_renovaciones
ALTER TABLE public.contratos_renovaciones ENABLE ROW LEVEL SECURITY;

-- RLS policies for contratos_renovaciones
CREATE POLICY "Authenticated users can view contratos_renovaciones"
ON public.contratos_renovaciones FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert contratos_renovaciones"
ON public.contratos_renovaciones FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can manage contratos_renovaciones"
ON public.contratos_renovaciones FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create table for equipment collection scheduling
CREATE TABLE public.recolecciones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  equipo_id uuid REFERENCES public.equipos(id) ON DELETE SET NULL,
  fecha_programada date NOT NULL,
  fecha_recoleccion date,
  status text NOT NULL DEFAULT 'pendiente',
  cliente text,
  direccion text,
  municipio text,
  estado_ubicacion text,
  ubicacion_gps text,
  chofer text,
  transporte text,
  comentarios text,
  usuario_id uuid,
  usuario_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on recolecciones
ALTER TABLE public.recolecciones ENABLE ROW LEVEL SECURITY;

-- RLS policies for recolecciones
CREATE POLICY "Authenticated users can view recolecciones"
ON public.recolecciones FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert recolecciones"
ON public.recolecciones FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update recolecciones"
ON public.recolecciones FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage recolecciones"
ON public.recolecciones FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on recolecciones
CREATE TRIGGER update_recolecciones_updated_at
BEFORE UPDATE ON public.recolecciones
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();