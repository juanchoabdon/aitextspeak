-- ============================================
-- USER PURCHASES TABLE
-- Stores plan purchases/activations from legacy ait_payment_purchased
-- This tracks what plan each user has/had, including free plans
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Legacy references
    legacy_id INTEGER UNIQUE,
    legacy_ids TEXT,
    legacy_user_ids TEXT,
    legacy_payment_ids TEXT,
    
    -- Purchase details
    item_type TEXT DEFAULT 'purchase', -- 'purchase', 'subscription', 'trial'
    item_ids TEXT,
    item_name TEXT, -- 'Free Plan', 'Monthly Plan', 'Lifetime Package', etc.
    
    -- Plan limits and usage (snapshot at time of purchase)
    characters_limit INTEGER,
    characters_used INTEGER DEFAULT 0,
    
    -- Status
    used_up BOOLEAN DEFAULT FALSE,
    auto_renew BOOLEAN DEFAULT FALSE,
    
    -- Voice lab features (if applicable)
    voicelab_data JSONB,
    
    -- Additional data
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Legacy flag
    is_legacy BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON public.user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_item_name ON public.user_purchases(item_name);
CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON public.user_purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_purchases_legacy_id ON public.user_purchases(legacy_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_legacy_user_ids ON public.user_purchases(legacy_user_ids);

-- RLS policies
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases" ON public.user_purchases
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage user purchases" ON public.user_purchases
    FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE public.user_purchases IS 'Historical record of user plan purchases and activations';

