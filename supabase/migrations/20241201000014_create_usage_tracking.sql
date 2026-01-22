-- ============================================
-- USAGE TRACKING TABLE
-- Track character usage per user per month
-- ============================================

CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Period tracking (monthly)
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Usage counts
    characters_used BIGINT DEFAULT 0,
    projects_created INTEGER DEFAULT 0,
    audio_files_generated INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one record per user per period
    UNIQUE(user_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_user_period ON public.usage_tracking(user_id, period_start);

-- RLS policies
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own usage" ON public.usage_tracking
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access usage" ON public.usage_tracking
    FOR ALL
    USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER on_usage_tracking_updated
    BEFORE UPDATE ON public.usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Function to get or create current period usage record
CREATE OR REPLACE FUNCTION public.get_or_create_usage(p_user_id UUID)
RETURNS public.usage_tracking AS $$
DECLARE
    v_period_start DATE;
    v_period_end DATE;
    v_usage public.usage_tracking;
BEGIN
    -- Calculate current month period
    v_period_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_period_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    -- Try to get existing record
    SELECT * INTO v_usage
    FROM public.usage_tracking
    WHERE user_id = p_user_id AND period_start = v_period_start;
    
    -- Create if not exists
    IF NOT FOUND THEN
        INSERT INTO public.usage_tracking (user_id, period_start, period_end)
        VALUES (p_user_id, v_period_start, v_period_end)
        RETURNING * INTO v_usage;
    END IF;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment character usage
CREATE OR REPLACE FUNCTION public.increment_character_usage(p_user_id UUID, p_characters INTEGER)
RETURNS public.usage_tracking AS $$
DECLARE
    v_usage public.usage_tracking;
BEGIN
    -- Get or create usage record
    v_usage := public.get_or_create_usage(p_user_id);
    
    -- Increment characters
    UPDATE public.usage_tracking
    SET characters_used = characters_used + p_characters,
        updated_at = NOW()
    WHERE id = v_usage.id
    RETURNING * INTO v_usage;
    
    RETURN v_usage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.usage_tracking IS 'Tracks monthly usage per user for plan limits';











