-- ============================================
-- REFACTOR PROJECTS FOR NEW FLOW
-- Projects now have a type and can have multiple audio files
-- ============================================

-- Add project_type enum
DO $$ BEGIN
    CREATE TYPE project_type AS ENUM ('youtube', 'audiobook', 'podcast', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add type column to projects
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS project_type project_type DEFAULT 'other';

-- Create project_audio table for multiple TTS per project
CREATE TABLE IF NOT EXISTS public.project_audio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    
    -- Audio content
    title TEXT, -- Optional title for this audio segment
    text_content TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    
    -- Voice settings used
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    language_code TEXT,
    provider TEXT NOT NULL,
    
    -- Stats
    characters_count INTEGER DEFAULT 0,
    duration_seconds INTEGER, -- Can be calculated after generation
    
    -- Order within project
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_audio_project_id ON public.project_audio(project_id);
CREATE INDEX IF NOT EXISTS idx_project_audio_created_at ON public.project_audio(created_at);

-- RLS policies
ALTER TABLE public.project_audio ENABLE ROW LEVEL SECURITY;

-- Users can view audio from their own projects
CREATE POLICY "Users can view their project audio" ON public.project_audio
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_audio.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Users can create audio in their own projects
CREATE POLICY "Users can create audio in their projects" ON public.project_audio
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_audio.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Users can delete audio from their own projects
CREATE POLICY "Users can delete their project audio" ON public.project_audio
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects 
            WHERE projects.id = project_audio.project_id 
            AND projects.user_id = auth.uid()
        )
    );

COMMENT ON TABLE public.project_audio IS 'Individual TTS audio files within a project';









