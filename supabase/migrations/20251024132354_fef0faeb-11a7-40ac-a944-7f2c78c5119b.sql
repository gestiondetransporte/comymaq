-- Add codigo_qr column to equipos table
ALTER TABLE public.equipos 
ADD COLUMN codigo_qr text UNIQUE;

-- Create index for faster QR code lookups
CREATE INDEX idx_equipos_codigo_qr ON public.equipos(codigo_qr);

COMMENT ON COLUMN public.equipos.codigo_qr IS 'Código QR único asignado al equipo para búsqueda rápida';