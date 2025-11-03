-- Drop all existing policies on contratos
DROP POLICY IF EXISTS "Authenticated users can view contratos" ON public.contratos;
DROP POLICY IF EXISTS "Admins can manage contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can insert contratos" ON public.contratos;
DROP POLICY IF EXISTS "Authenticated users can update contratos" ON public.contratos;
DROP POLICY IF EXISTS "Admins can delete contratos" ON public.contratos;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can view contratos"
ON public.contratos
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert contratos"
ON public.contratos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update contratos"
ON public.contratos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can delete contratos"
ON public.contratos
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));