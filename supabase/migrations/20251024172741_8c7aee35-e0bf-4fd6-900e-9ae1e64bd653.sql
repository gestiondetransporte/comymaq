-- Allow authenticated users to insert and update their own entradas_salidas
CREATE POLICY "Authenticated users can insert entradas_salidas"
ON public.entradas_salidas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update entradas_salidas"
ON public.entradas_salidas
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Allow authenticated users to insert and update their own mantenimientos
CREATE POLICY "Authenticated users can insert mantenimientos"
ON public.mantenimientos
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update mantenimientos"
ON public.mantenimientos
FOR UPDATE
TO authenticated
USING (auth.uid() = usuario_id);