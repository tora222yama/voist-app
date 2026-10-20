-- Add missing UPDATE policy for storage objects
-- Supabase Storage may attempt an UPDATE on metadata even during fresh uploads
CREATE POLICY "auth_update_illustrations_storage" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'illustrations') WITH CHECK (bucket_id = 'illustrations');

CREATE POLICY "auth_update_audio_storage" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'audio') WITH CHECK (bucket_id = 'audio');
