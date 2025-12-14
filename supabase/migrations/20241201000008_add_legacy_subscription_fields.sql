-- ============================================
-- ADD LEGACY FIELDS TO SUBSCRIPTIONS TABLE
-- ============================================

-- Add legacy-specific columns if they don't exist
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS legacy_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS legacy_ids TEXT,
ADD COLUMN IF NOT EXISTS legacy_item_ids TEXT,
ADD COLUMN IF NOT EXISTS legacy_user_ids TEXT,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS used_up BOOLEAN DEFAULT FALSE;

-- Add 'lifetime' to subscription status enum if not exists
DO $$ 
BEGIN
    ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'lifetime';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Index for legacy lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_legacy_id ON public.subscriptions(legacy_id);

COMMENT ON COLUMN public.subscriptions.legacy_id IS 'Original MySQL subscription id';
COMMENT ON COLUMN public.subscriptions.legacy_ids IS 'Original ids field from legacy';
COMMENT ON COLUMN public.subscriptions.legacy_item_ids IS 'Original item_ids (plan) from legacy';
COMMENT ON COLUMN public.subscriptions.quantity IS 'Subscription quantity';
COMMENT ON COLUMN public.subscriptions.auto_renew IS 'Whether subscription auto-renews';









