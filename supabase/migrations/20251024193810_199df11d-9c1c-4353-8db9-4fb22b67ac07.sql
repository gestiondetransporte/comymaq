-- Add new roles to enum (must be done in separate transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'almacen';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'tecnico';