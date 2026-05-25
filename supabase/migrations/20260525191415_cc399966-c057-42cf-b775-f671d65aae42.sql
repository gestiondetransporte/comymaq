
-- Helper: get current user email
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 1) equipos: log estado/ubicacion changes
CREATE OR REPLACE FUNCTION public.log_equipo_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipos_log (equipo_id, numero_equipo, tipo_movimiento, descripcion, estado_nuevo, ubicacion_nueva, usuario_id, usuario_email)
    VALUES (NEW.id, NEW.numero_equipo, 'cambio_estado', 'Equipo creado', NEW.estado, NEW.ubicacion_actual, auth.uid(), public.current_user_email());
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.estado,'') IS DISTINCT FROM COALESCE(OLD.estado,'')
     OR COALESCE(NEW.ubicacion_actual,'') IS DISTINCT FROM COALESCE(OLD.ubicacion_actual,'')
     OR COALESCE(NEW.numero_equipo,'') IS DISTINCT FROM COALESCE(OLD.numero_equipo,'') THEN
    INSERT INTO public.equipos_log (
      equipo_id, numero_equipo, tipo_movimiento, descripcion,
      estado_anterior, estado_nuevo, ubicacion_anterior, ubicacion_nueva,
      usuario_id, usuario_email, datos_extra
    ) VALUES (
      NEW.id, NEW.numero_equipo, 'cambio_estado',
      CASE 
        WHEN COALESCE(NEW.numero_equipo,'') IS DISTINCT FROM COALESCE(OLD.numero_equipo,'')
          THEN 'Número de equipo cambiado de ' || COALESCE(OLD.numero_equipo,'-') || ' a ' || COALESCE(NEW.numero_equipo,'-')
        WHEN COALESCE(NEW.estado,'') IS DISTINCT FROM COALESCE(OLD.estado,'')
          THEN 'Cambio de estado: ' || COALESCE(OLD.estado,'-') || ' → ' || COALESCE(NEW.estado,'-')
        ELSE 'Cambio de ubicación'
      END,
      OLD.estado, NEW.estado, OLD.ubicacion_actual, NEW.ubicacion_actual,
      auth.uid(), public.current_user_email(),
      jsonb_build_object('numero_anterior', OLD.numero_equipo, 'numero_nuevo', NEW.numero_equipo)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_equipo_change ON public.equipos;
CREATE TRIGGER trg_log_equipo_change
AFTER INSERT OR UPDATE ON public.equipos
FOR EACH ROW EXECUTE FUNCTION public.log_equipo_change();

-- 2) entradas_salidas: log each movement
CREATE OR REPLACE FUNCTION public.log_entrada_salida()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_numero text;
  v_tipo text;
BEGIN
  IF NEW.equipo_id IS NULL THEN RETURN NEW; END IF;
  SELECT numero_equipo INTO v_numero FROM public.equipos WHERE id = NEW.equipo_id;
  v_tipo := CASE WHEN NEW.tipo = 'entrada' THEN 'entrada'
                 WHEN NEW.tipo = 'salida' THEN 'salida'
                 ELSE 'cambio_estado' END;
  INSERT INTO public.equipos_log (
    equipo_id, numero_equipo, tipo_movimiento, descripcion,
    cliente, usuario_id, usuario_email, datos_extra
  ) VALUES (
    NEW.equipo_id, COALESCE(v_numero, ''), v_tipo,
    COALESCE(NEW.comentarios, NEW.tipo || ' registrada'),
    NEW.cliente, NEW.created_by, public.current_user_email(),
    jsonb_build_object('obra', NEW.obra, 'chofer', NEW.chofer, 'transporte', NEW.transporte)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_entrada_salida ON public.entradas_salidas;
CREATE TRIGGER trg_log_entrada_salida
AFTER INSERT ON public.entradas_salidas
FOR EACH ROW EXECUTE FUNCTION public.log_entrada_salida();

-- 3) contratos: log creation
CREATE OR REPLACE FUNCTION public.log_contrato_creado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_numero text;
BEGIN
  IF NEW.equipo_id IS NULL THEN RETURN NEW; END IF;
  SELECT numero_equipo INTO v_numero FROM public.equipos WHERE id = NEW.equipo_id;
  INSERT INTO public.equipos_log (
    equipo_id, numero_equipo, tipo_movimiento, descripcion,
    cliente, contrato_folio, usuario_id, usuario_email
  ) VALUES (
    NEW.equipo_id, COALESCE(v_numero, ''), 'contrato',
    'Contrato creado: ' || NEW.folio_contrato,
    NEW.cliente, NEW.folio_contrato, auth.uid(), public.current_user_email()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_contrato_creado ON public.contratos;
CREATE TRIGGER trg_log_contrato_creado
AFTER INSERT ON public.contratos
FOR EACH ROW EXECUTE FUNCTION public.log_contrato_creado();

-- 4) mantenimientos
CREATE OR REPLACE FUNCTION public.log_mantenimiento_creado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_numero text;
BEGIN
  SELECT numero_equipo INTO v_numero FROM public.equipos WHERE id = NEW.equipo_id;
  INSERT INTO public.equipos_log (
    equipo_id, numero_equipo, tipo_movimiento, descripcion,
    usuario_id, usuario_email
  ) VALUES (
    NEW.equipo_id, COALESCE(v_numero, ''), 'mantenimiento',
    NEW.tipo_servicio || ': ' || COALESCE(NEW.descripcion, ''),
    NEW.usuario_id, public.current_user_email()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_mantenimiento ON public.mantenimientos;
CREATE TRIGGER trg_log_mantenimiento
AFTER INSERT ON public.mantenimientos
FOR EACH ROW EXECUTE FUNCTION public.log_mantenimiento_creado();

-- 5) renovaciones
CREATE OR REPLACE FUNCTION public.log_renovacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_numero text; v_equipo uuid; v_cliente text; v_folio text;
BEGIN
  SELECT equipo_id, cliente, folio_contrato INTO v_equipo, v_cliente, v_folio
  FROM public.contratos WHERE id = NEW.contrato_id;
  IF v_equipo IS NULL THEN RETURN NEW; END IF;
  SELECT numero_equipo INTO v_numero FROM public.equipos WHERE id = v_equipo;
  INSERT INTO public.equipos_log (
    equipo_id, numero_equipo, tipo_movimiento, descripcion,
    cliente, contrato_folio, usuario_id, usuario_email
  ) VALUES (
    v_equipo, COALESCE(v_numero, ''), 'renovacion',
    'Renovación de contrato ' || COALESCE(v_folio,'') || ' hasta ' || NEW.fecha_vencimiento_nueva::text,
    v_cliente, v_folio, NEW.usuario_id, public.current_user_email()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_renovacion ON public.contratos_renovaciones;
CREATE TRIGGER trg_log_renovacion
AFTER INSERT ON public.contratos_renovaciones
FOR EACH ROW EXECUTE FUNCTION public.log_renovacion();

-- 6) recolecciones (on create and on completed)
CREATE OR REPLACE FUNCTION public.log_recoleccion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_numero text; v_folio text;
BEGIN
  IF NEW.equipo_id IS NULL THEN RETURN NEW; END IF;
  SELECT numero_equipo INTO v_numero FROM public.equipos WHERE id = NEW.equipo_id;
  SELECT folio_contrato INTO v_folio FROM public.contratos WHERE id = NEW.contrato_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipos_log (
      equipo_id, numero_equipo, tipo_movimiento, descripcion,
      cliente, contrato_folio, usuario_id, usuario_email
    ) VALUES (
      NEW.equipo_id, COALESCE(v_numero, ''), 'recoleccion',
      'Recolección programada para ' || NEW.fecha_programada::text,
      NEW.cliente, v_folio, NEW.usuario_id, public.current_user_email()
    );
  ELSIF TG_OP = 'UPDATE' AND COALESCE(NEW.status,'') IS DISTINCT FROM COALESCE(OLD.status,'') THEN
    INSERT INTO public.equipos_log (
      equipo_id, numero_equipo, tipo_movimiento, descripcion,
      cliente, contrato_folio, usuario_id, usuario_email
    ) VALUES (
      NEW.equipo_id, COALESCE(v_numero, ''), 'recoleccion',
      'Recolección ' || NEW.status,
      NEW.cliente, v_folio, NEW.usuario_id, public.current_user_email()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_recoleccion ON public.recolecciones;
CREATE TRIGGER trg_log_recoleccion
AFTER INSERT OR UPDATE ON public.recolecciones
FOR EACH ROW EXECUTE FUNCTION public.log_recoleccion();
