CREATE TABLE public.crm_recordatorios_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activo boolean NOT NULL DEFAULT true,
  dias_sin_contacto integer NOT NULL DEFAULT 5,
  dias_anticipacion_accion integer NOT NULL DEFAULT 5,
  notificar_vendedor boolean NOT NULL DEFAULT true,
  notificar_cliente boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.crm_recordatorios_config TO authenticated;
GRANT ALL ON public.crm_recordatorios_config TO service_role;
ALTER TABLE public.crm_recordatorios_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver la configuracion"
  ON public.crm_recordatorios_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gestionan la configuracion"
  ON public.crm_recordatorios_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_crm_recordatorios_config_updated_at
  BEFORE UPDATE ON public.crm_recordatorios_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

INSERT INTO public.crm_recordatorios_config DEFAULT VALUES;

CREATE TABLE public.crm_recordatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  destinatario_tipo text NOT NULL,
  destinatario_nombre text,
  destinatario_email text,
  destinatario_telefono text,
  canal text NOT NULL,
  asunto text,
  mensaje text,
  estado text NOT NULL DEFAULT 'pendiente',
  dia date NOT NULL DEFAULT CURRENT_DATE,
  enviado_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_recordatorios_cotizacion ON public.crm_recordatorios(cotizacion_id);
CREATE UNIQUE INDEX idx_crm_recordatorios_dedupe
  ON public.crm_recordatorios(cotizacion_id, motivo, destinatario_tipo, canal, dia);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_recordatorios TO authenticated;
GRANT ALL ON public.crm_recordatorios TO service_role;
ALTER TABLE public.crm_recordatorios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados pueden ver recordatorios"
  ON public.crm_recordatorios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden crear recordatorios"
  ON public.crm_recordatorios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados pueden actualizar recordatorios"
  ON public.crm_recordatorios FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Admins pueden borrar recordatorios"
  ON public.crm_recordatorios FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_crm_recordatorios_updated_at
  BEFORE UPDATE ON public.crm_recordatorios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();