-- Add image URL columns
ALTER TABLE public.teams   ADD COLUMN IF NOT EXISTS logo_url  TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage buckets (public, 2 MB limit, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('team-logos',    'team-logos',    true, 2097152,
   ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('player-images', 'player-images', true, 2097152,
   ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO NOTHING;

-- ── team-logos policies ────────────────────────────────────────────────────

CREATE POLICY "team-logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'team-logos');

CREATE POLICY "team-logos: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "team-logos: auth update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "team-logos: auth delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'team-logos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── player-images policies ─────────────────────────────────────────────────

CREATE POLICY "player-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'player-images');

CREATE POLICY "player-images: auth upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'player-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "player-images: auth update own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'player-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "player-images: auth delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'player-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
