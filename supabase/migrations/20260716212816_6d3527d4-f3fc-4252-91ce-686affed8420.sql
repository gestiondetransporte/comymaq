
-- 1) Extend cotizaciones
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS motivo_aceptacion text,
  ADD COLUMN IF NOT EXISTS motivo_rechazo text,
  ADD COLUMN IF NOT EXISTS ultimo_acercamiento_fecha timestamptz,
  ADD COLUMN IF NOT EXISTS ultimo_acercamiento_nota text,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- 2) CRM seguimientos table
CREATE TABLE IF NOT EXISTS public.crm_seguimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones(id) ON DELETE CASCADE,
  tipo_contacto text NOT NULL CHECK (tipo_contacto IN ('llamada','whatsapp','correo','visita','otro')),
  notas text,
  resultado text,
  proxima_accion text,
  proxima_accion_fecha date,
  usuario_id uuid,
  usuario_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_seguimientos TO authenticated;
GRANT ALL ON public.crm_seguimientos TO service_role;

ALTER TABLE public.crm_seguimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin y vendedor pueden ver seguimientos"
  ON public.crm_seguimientos FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'vendedor')
  );

CREATE POLICY "Usuarios autenticados pueden crear seguimientos"
  ON public.crm_seguimientos FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = usuario_id
    AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'vendedor'))
  );

CREATE POLICY "Autor o admin pueden editar seguimientos"
  ON public.crm_seguimientos FOR UPDATE TO authenticated
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = usuario_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Solo admin puede borrar seguimientos"
  ON public.crm_seguimientos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_crm_seguimientos_updated_at
  BEFORE UPDATE ON public.crm_seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_crm_seg_cotizacion ON public.crm_seguimientos(cotizacion_id);
CREATE INDEX IF NOT EXISTS idx_crm_seg_proxima_fecha ON public.crm_seguimientos(proxima_accion_fecha);

-- 3) Trigger: on status change, stamp status_changed_at and mirror to ultimo_acercamiento
CREATE OR REPLACE FUNCTION public.cotizacion_track_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND COALESCE(NEW.status,'') IS DISTINCT FROM COALESCE(OLD.status,'') THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cotizacion_status_change ON public.cotizaciones;
CREATE TRIGGER trg_cotizacion_status_change
  BEFORE UPDATE ON public.cotizaciones
  FOR EACH ROW EXECUTE FUNCTION public.cotizacion_track_status_change();

-- 4) Trigger: when a seguimiento is created, refresh cotizacion.ultimo_acercamiento
CREATE OR REPLACE FUNCTION public.crm_seguimiento_refresh_cotizacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.cotizaciones
     SET ultimo_acercamiento_fecha = NEW.created_at,
         ultimo_acercamiento_nota  = COALESCE(NEW.resultado, NEW.notas)
   WHERE id = NEW.cotizacion_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_refresh_cotizacion ON public.crm_seguimientos;
CREATE TRIGGER trg_crm_refresh_cotizacion
  AFTER INSERT ON public.crm_seguimientos
  FOR EACH ROW EXECUTE FUNCTION public.crm_seguimiento_refresh_cotizacion();
