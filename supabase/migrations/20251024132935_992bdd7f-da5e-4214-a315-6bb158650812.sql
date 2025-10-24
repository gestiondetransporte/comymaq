-- Create clientes table
CREATE TABLE public.clientes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre text NOT NULL,
  razon_social text,
  rfc text,
  direccion text,
  persona_contacto text,
  telefono text,
  correo_electronico text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view clientes"
  ON public.clientes
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage clientes"
  ON public.clientes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster searches
CREATE INDEX idx_clientes_nombre ON public.clientes(nombre);
CREATE INDEX idx_clientes_rfc ON public.clientes(rfc);

COMMENT ON TABLE public.clientes IS 'Catálogo de clientes de COMYMAQ';