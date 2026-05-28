
-- Function to get the vendedor name linked to the current authenticated user
CREATE OR REPLACE FUNCTION public.current_user_vendedor_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.nombre
  FROM public.personal p
  WHERE p.categoria = 'vendedor'
    AND lower(p.correo) = lower(public.current_user_email())
  LIMIT 1
$$;

-- CONTRATOS: replace permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON public.contratos;

CREATE POLICY "View contratos with vendedor scope"
ON public.contratos
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR NOT public.has_role(auth.uid(), 'vendedor'::app_role)
  OR lower(coalesce(vendedor, '')) = lower(coalesce(public.current_user_vendedor_name(), ''))
);

-- COTIZACIONES: replace permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view cotizaciones" ON public.cotizaciones;

CREATE POLICY "View cotizaciones with vendedor scope"
ON public.cotizaciones
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR NOT public.has_role(auth.uid(), 'vendedor'::app_role)
  OR lower(coalesce(vendedor, '')) = lower(coalesce(public.current_user_vendedor_name(), ''))
  OR lower(coalesce(vendedor_correo, '')) = lower(coalesce(public.current_user_email(), ''))
  OR created_by = auth.uid()
);
