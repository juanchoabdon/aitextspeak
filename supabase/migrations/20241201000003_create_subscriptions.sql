-- ============================================
-- SUBSCRIPTIONS TABLE
-- Tracks Stripe and PayPal subscriptions
-- ============================================

-- Enum for payment providers
-- Stripe: single account for all users (old and new)
-- PayPal: separate accounts for legacy (paypal_legacy) and new (paypal) users
CREATE TYPE public.payment_provider AS ENUM (
    'stripe',
    'paypal',
    'paypal_legacy'
);

-- Enum for subscription status
CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'canceled',
    'past_due',
    'unpaid',
    'trialing',
    'paused',
    'incomplete',
    'incomplete_expired'
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Provider info
    provider public.payment_provider NOT NULL,
    provider_subscription_id TEXT NOT NULL, -- Stripe sub_xxx or PayPal I-xxx
    provider_customer_id TEXT, -- Stripe cus_xxx or PayPal payer ID
    
    -- Subscription details
    status public.subscription_status DEFAULT 'active',
    plan_id TEXT, -- Internal plan identifier
    plan_name TEXT, -- Human readable plan name
    
    -- Pricing
    price_amount INTEGER, -- Amount in cents
    price_currency TEXT DEFAULT 'usd',
    billing_interval TEXT, -- 'month', 'year'
    
    -- Dates
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Legacy migration data
    is_legacy BOOLEAN DEFAULT FALSE,
    legacy_data JSONB, -- Store any additional legacy data
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(provider, provider_subscription_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider ON public.subscriptions(provider);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id ON public.subscriptions(provider_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON public.subscriptions(current_period_end);

-- RLS policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Only service role can modify subscriptions (webhooks)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER on_subscriptions_updated
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.subscriptions IS 'User subscriptions from Stripe and PayPal';

-- ============================================
-- HELPER VIEW: Active Subscriptions
-- ============================================

CREATE OR REPLACE VIEW public.active_subscriptions AS
SELECT 
    s.*,
    p.email,
    p.first_name,
    p.last_name
FROM public.subscriptions s
JOIN public.profiles p ON s.user_id = p.id
WHERE s.status = 'active'
  AND (s.current_period_end IS NULL OR s.current_period_end > NOW());

COMMENT ON VIEW public.active_subscriptions IS 'View of currently active subscriptions';

