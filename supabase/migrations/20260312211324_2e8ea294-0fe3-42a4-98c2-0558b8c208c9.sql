
CREATE TABLE public.personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  correo text NULL,
  telefono text NULL,
  categoria text NOT NULL DEFAULT 'trabajador',
  puesto text NULL,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personal" ON public.personal FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view personal" ON public.personal FOR SELECT TO authenticated USING (true);
