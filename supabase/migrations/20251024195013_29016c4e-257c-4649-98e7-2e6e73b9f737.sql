-- Eliminar la restricción antigua
ALTER TABLE public.mantenimientos 
DROP CONSTRAINT IF EXISTS mantenimientos_tipo_servicio_check;

-- Crear nueva restricción con todos los tipos permitidos
ALTER TABLE public.mantenimientos 
ADD CONSTRAINT mantenimientos_tipo_servicio_check 
CHECK (tipo_servicio IN ('preventivo', 'correctivo', 'revision', 'reparacion', 'programado'));

-- Cambiar proximo_servicio de date a integer (para guardar horas)
ALTER TABLE public.mantenimientos 
ALTER COLUMN proximo_servicio TYPE integer USING NULL;

-- Renombrar la columna para que sea más clara
ALTER TABLE public.mantenimientos 
RENAME COLUMN proximo_servicio TO proximo_servicio_horas;

-- Agregar comentario para documentar el cambio
COMMENT ON COLUMN public.mantenimientos.proximo_servicio_horas IS 'Horas de operación para el próximo servicio (300, 400, 500, etc.)';