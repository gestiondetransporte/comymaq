-- Create table for model pricing and photos
CREATE TABLE public.modelos_configuracion (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo TEXT NOT NULL UNIQUE,
  precio_lista NUMERIC,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modelos_configuracion ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view model configurations
CREATE POLICY "Authenticated users can view modelos_configuracion"
ON public.modelos_configuracion
FOR SELECT
USING (true);

-- Only admins can manage model configurations
CREATE POLICY "Admins can manage modelos_configuracion"
ON public.modelos_configuracion
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_modelos_configuracion_updated_at
BEFORE UPDATE ON public.modelos_configuracion
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for model photos
INSERT INTO storage.buckets (id, name, public) VALUES ('modelos', 'modelos', true);

-- Storage policies for model photos
CREATE POLICY "Model photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'modelos');

CREATE POLICY "Admins can upload model photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'modelos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update model photos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'modelos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete model photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'modelos' AND has_role(auth.uid(), 'admin'::app_role));