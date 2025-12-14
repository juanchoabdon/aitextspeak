-- ============================================
-- PROJECTS TABLE
-- Stores TTS projects (both legacy and new)
-- ============================================

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference (Supabase Auth)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Legacy identifiers (for migrated projects)
    legacy_id INTEGER UNIQUE, -- Original MySQL id
    legacy_ids TEXT, -- Original 'ids' field
    legacy_user_ids TEXT, -- Original 'user_ids' field
    
    -- Project details
    title TEXT NOT NULL,
    campaign TEXT,
    
    -- TTS Configuration
    engine TEXT, -- e.g., 'polly', 'google', etc.
    scheme TEXT,
    language_code TEXT,
    language_name TEXT,
    voice_id TEXT,
    voice_name TEXT,
    config JSONB, -- Parsed from legacy varchar
    
    -- Content
    text_content TEXT NOT NULL,
    characters_count INTEGER DEFAULT 0,
    
    -- Audio file
    storage TEXT, -- Storage provider (legacy: 's3', 'local', etc.)
    audio_url TEXT, -- URL to the audio file
    
    -- Status
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    is_legacy BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_legacy_id ON public.projects(legacy_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- RLS policies
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Users can view their own projects
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER on_projects_updated
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.projects IS 'TTS projects including migrated legacy projects';









