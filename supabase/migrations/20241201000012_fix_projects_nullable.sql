-- ============================================
-- Make text_content nullable for new project flow
-- Projects are now created without audio initially
-- ============================================

-- Make text_content nullable (for new projects without audio yet)
ALTER TABLE public.projects 
ALTER COLUMN text_content DROP NOT NULL;

-- Make audio_url nullable explicitly (should already be)
ALTER TABLE public.projects 
ALTER COLUMN audio_url DROP NOT NULL;











