-- Create table for quotation history
CREATE TABLE public.cotizaciones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id),
  equipo_id UUID REFERENCES public.equipos(id),
  created_by UUID REFERENCES auth.users(id),
  cliente_nombre TEXT NOT NULL,
  atencion TEXT,
  telefono TEXT,
  correo TEXT,
  equipo_descripcion TEXT NOT NULL,
  equipo_modelo TEXT,
  equipo_marca TEXT,
  dias_renta INTEGER NOT NULL,
  precio_base NUMERIC NOT NULL,
  entrega_recoleccion NUMERIC DEFAULT 0,
  seguro_percent NUMERIC DEFAULT 4,
  subtotal NUMERIC NOT NULL,
  total_con_iva NUMERIC NOT NULL,
  vendedor TEXT,
  vendedor_correo TEXT,
  vendedor_telefono TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all quotations
CREATE POLICY "Authenticated users can view cotizaciones"
ON public.cotizaciones
FOR SELECT
USING (true);

-- Authenticated users can insert quotations
CREATE POLICY "Authenticated users can insert cotizaciones"
ON public.cotizaciones
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Admins can manage all quotations
CREATE POLICY "Admins can manage cotizaciones"
ON public.cotizaciones
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_cotizaciones_created_at ON public.cotizaciones(created_at DESC);
CREATE INDEX idx_cotizaciones_cliente ON public.cotizaciones(cliente_id);