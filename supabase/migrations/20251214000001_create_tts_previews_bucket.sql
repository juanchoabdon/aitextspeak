-- ============================================
-- STORAGE BUCKET FOR TTS PREVIEW FILES
-- Kept separate from saved project audio so previews don't look like saved audio.
-- ============================================

-- Create the tts-previews bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-previews',
  'tts-previews',
  true, -- Public bucket so previews can be played via URL
  10485760, -- 10MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-wav']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can listen (public bucket)
CREATE POLICY "Public read access for tts previews"
ON storage.objects FOR SELECT
USING (bucket_id = 'tts-previews');

-- Policy: Authenticated users can upload previews
CREATE POLICY "Authenticated users can upload tts previews"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tts-previews'
  AND auth.role() = 'authenticated'
);

-- Policy: Authenticated users can delete previews
CREATE POLICY "Authenticated users can delete tts previews"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tts-previews'
  AND auth.role() = 'authenticated'
);


