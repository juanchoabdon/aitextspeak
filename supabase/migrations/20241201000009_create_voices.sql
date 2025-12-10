-- ============================================
-- VOICES TABLE
-- Stores available TTS voices (Azure, 11Labs)
-- ============================================

CREATE TABLE IF NOT EXISTS public.voices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Legacy identifiers
    legacy_id INTEGER,
    legacy_ids TEXT,
    
    -- Provider info
    provider TEXT NOT NULL CHECK (provider IN ('azure', 'elevenlabs')),
    engine TEXT DEFAULT 'neural',
    
    -- Voice details
    voice_id TEXT NOT NULL, -- e.g., 'en-US-JennyNeural' for Azure
    name TEXT NOT NULL, -- Display name
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Neutral')),
    
    -- Language
    language_code TEXT NOT NULL, -- e.g., 'en-US'
    language_name TEXT NOT NULL, -- e.g., 'English (US)'
    
    -- Additional info
    description TEXT,
    sample_url TEXT,
    
    -- Status
    enabled BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(provider, voice_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voices_provider ON public.voices(provider);
CREATE INDEX IF NOT EXISTS idx_voices_language_code ON public.voices(language_code);
CREATE INDEX IF NOT EXISTS idx_voices_enabled ON public.voices(enabled);

-- RLS policies
ALTER TABLE public.voices ENABLE ROW LEVEL SECURITY;

-- Everyone can read voices
CREATE POLICY "Everyone can read voices" ON public.voices
    FOR SELECT
    USING (true);

-- Only service role can modify
CREATE POLICY "Service role can manage voices" ON public.voices
    FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE public.voices IS 'Available TTS voices from Azure and ElevenLabs';



