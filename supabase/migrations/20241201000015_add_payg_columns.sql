-- ============================================
-- ADD PAYG COLUMNS TO USAGE TRACKING
-- For legacy users who had pay-as-you-go credits
-- ============================================

ALTER TABLE public.usage_tracking
ADD COLUMN IF NOT EXISTS payg_balance BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS payg_purchased BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS characters_preview_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS characters_production_used BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_legacy_data BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN public.usage_tracking.payg_balance IS 'Pay-as-you-go characters remaining (legacy feature)';
COMMENT ON COLUMN public.usage_tracking.payg_purchased IS 'Total pay-as-you-go characters ever purchased';
COMMENT ON COLUMN public.usage_tracking.characters_preview_used IS 'Characters used for preview/testing';
COMMENT ON COLUMN public.usage_tracking.characters_production_used IS 'Characters used for final audio generation';
COMMENT ON COLUMN public.usage_tracking.is_legacy_data IS 'True if this record was migrated from legacy system';



