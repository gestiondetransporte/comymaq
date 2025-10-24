-- Agregar el rol 'vendedor' al enum existente
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';