-- ============================================
-- PREVIEWS TABLE
-- Stores TTS preview audio before final project creation
-- ============================================

CREATE TABLE IF NOT EXISTS public.previews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Preview content
    text_preview TEXT NOT NULL, -- First 200 chars used for preview
    audio_url TEXT NOT NULL,
    
    -- Voice settings
    voice_id TEXT NOT NULL,
    voice_name TEXT,
    language_code TEXT,
    provider TEXT NOT NULL,
    
    -- Session tracking (to restore on refresh)
    session_key TEXT NOT NULL, -- Unique key for this creation session
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_previews_user_id ON public.previews(user_id);
CREATE INDEX IF NOT EXISTS idx_previews_session_key ON public.previews(session_key);
CREATE INDEX IF NOT EXISTS idx_previews_expires_at ON public.previews(expires_at);

-- RLS policies
ALTER TABLE public.previews ENABLE ROW LEVEL SECURITY;

-- Users can only see their own previews
CREATE POLICY "Users can view their own previews" ON public.previews
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own previews
CREATE POLICY "Users can create their own previews" ON public.previews
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own previews
CREATE POLICY "Users can delete their own previews" ON public.previews
    FOR DELETE
    USING (auth.uid() = user_id);

-- Cleanup function to remove expired previews
CREATE OR REPLACE FUNCTION cleanup_expired_previews()
RETURNS void AS $$
BEGIN
    DELETE FROM public.previews WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.previews IS 'Temporary TTS preview audio files';









