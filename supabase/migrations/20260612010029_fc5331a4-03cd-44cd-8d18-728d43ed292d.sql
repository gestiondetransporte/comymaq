
CREATE OR REPLACE FUNCTION public.log_equipo_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_alm text;
  v_new_alm text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipos_log (equipo_id, numero_equipo, tipo_movimiento, descripcion, estado_nuevo, ubicacion_nueva, usuario_id, usuario_email)
    VALUES (NEW.id, NEW.numero_equipo, 'cambio_estado', 'Equipo creado', NEW.estado, NEW.ubicacion_actual, auth.uid(), public.current_user_email());
    RETURN NEW;
  END IF;

  -- Detect warehouse change
  IF COALESCE(NEW.almacen_id::text,'') IS DISTINCT FROM COALESCE(OLD.almacen_id::text,'') THEN
    SELECT nombre INTO v_old_alm FROM public.almacenes WHERE id = OLD.almacen_id;
    SELECT nombre INTO v_new_alm FROM public.almacenes WHERE id = NEW.almacen_id;
    INSERT INTO public.equipos_log (
      equipo_id, numero_equipo, tipo_movimiento, descripcion,
      ubicacion_anterior, ubicacion_nueva,
      usuario_id, usuario_email, datos_extra
    ) VALUES (
      NEW.id, NEW.numero_equipo, 'cambio_almacen',
      'Cambio de almacén: ' || COALESCE(v_old_alm,'-') || ' → ' || COALESCE(v_new_alm,'-'),
      v_old_alm, v_new_alm,
      auth.uid(), public.current_user_email(),
      jsonb_build_object('almacen_anterior_id', OLD.almacen_id, 'almacen_nuevo_id', NEW.almacen_id)
    );
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
$function$;
