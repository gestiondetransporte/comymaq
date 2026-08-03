ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS contrato_firmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_firma date,
  ADD COLUMN IF NOT EXISTS contrato_firmado_url text,
  ADD COLUMN IF NOT EXISTS orden_compra boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS orden_compra_numero text,
  ADD COLUMN IF NOT EXISTS orden_compra_url text,
  ADD COLUMN IF NOT EXISTS notas_validacion text;