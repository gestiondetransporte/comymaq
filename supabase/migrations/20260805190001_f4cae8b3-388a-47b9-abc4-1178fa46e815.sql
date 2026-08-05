CREATE POLICY "Auth users can read contratos files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'contratos');
CREATE POLICY "Auth users can upload contratos files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'contratos');
CREATE POLICY "Auth users can update contratos files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'contratos');
CREATE POLICY "Auth users can delete contratos files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'contratos');