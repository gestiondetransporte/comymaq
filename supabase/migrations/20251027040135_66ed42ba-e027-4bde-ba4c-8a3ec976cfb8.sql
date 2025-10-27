-- Agregar constraint unique a folio_contrato para permitir upsert
ALTER TABLE public.contratos ADD CONSTRAINT contratos_folio_contrato_unique UNIQUE (folio_contrato);