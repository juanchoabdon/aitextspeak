-- ============================================
-- STORAGE BUCKET FOR PROJECT AUDIO FILES
-- ============================================

-- Create the project-audio bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-audio',
  'project-audio',
  true, -- Public bucket so audio can be played via URL
  52428800, -- 50MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-wav']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can listen to audio (public bucket)
CREATE POLICY "Public read access for project audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-audio');

-- Policy: Authenticated users can upload their audio
CREATE POLICY "Authenticated users can upload project audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'project-audio' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can update their audio files
CREATE POLICY "Authenticated users can update project audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'project-audio' 
  AND auth.role() = 'authenticated'
);

-- Policy: Users can delete their audio files
CREATE POLICY "Authenticated users can delete project audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'project-audio' 
  AND auth.role() = 'authenticated'
);











