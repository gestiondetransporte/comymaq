-- Permitir que usuarios autenticados (no solo admin) puedan insertar y actualizar equipos
CREATE POLICY "Authenticated users can insert equipos"
ON public.equipos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update equipos"
ON public.equipos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir que usuarios autenticados puedan insertar y actualizar archivos de equipos
CREATE POLICY "Authenticated users can update archivos de equipos"
ON public.equipos_archivos
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete archivos de equipos"
ON public.equipos_archivos
FOR DELETE
TO authenticated
USING (true);