-- Create a sequence for equipment folio
CREATE SEQUENCE IF NOT EXISTS equipos_folio_seq START WITH 1;

-- Add folio column to equipos table
ALTER TABLE public.equipos 
ADD COLUMN folio INTEGER UNIQUE DEFAULT nextval('equipos_folio_seq');

-- Update existing records to have a folio
UPDATE public.equipos 
SET folio = nextval('equipos_folio_seq') 
WHERE folio IS NULL;

-- Make folio NOT NULL after populating existing records
ALTER TABLE public.equipos 
ALTER COLUMN folio SET NOT NULL;

-- Create index for faster lookups
CREATE INDEX idx_equipos_folio ON public.equipos(folio);