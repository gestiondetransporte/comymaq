-- Add vendedor column to clientes table
ALTER TABLE public.clientes ADD COLUMN vendedor text;

-- Create equipos_log table for tracking all equipment movements
CREATE TABLE public.equipos_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id uuid NOT NULL,
  numero_equipo text NOT NULL,
  tipo_movimiento text NOT NULL,
  descripcion text,
  estado_anterior text,
  estado_nuevo text,
  ubicacion_anterior text,
  ubicacion_nueva text,
  cliente text,
  contrato_folio text,
  usuario_id uuid,
  usuario_email text,
  datos_extra jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipos_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view equipos_log"
ON public.equipos_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert equipos_log"
ON public.equipos_log
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage equipos_log"
ON public.equipos_log
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_equipos_log_equipo_id ON public.equipos_log(equipo_id);
CREATE INDEX idx_equipos_log_created_at ON public.equipos_log(created_at DESC);
CREATE INDEX idx_equipos_log_tipo_movimiento ON public.equipos_log(tipo_movimiento);