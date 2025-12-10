-- ============================================
-- PAYMENT HISTORY TABLE
-- Stores transaction/invoice history from legacy ait_payment_log
-- ============================================

CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User reference
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Legacy references
    legacy_id INTEGER UNIQUE,
    legacy_ids TEXT,
    legacy_user_ids TEXT,
    legacy_payment_ids TEXT,
    
    -- Transaction details
    transaction_type TEXT NOT NULL, -- 'subscription', 'one_time', 'refund', etc.
    gateway TEXT NOT NULL, -- 'stripe', 'paypal'
    gateway_identifier TEXT, -- Stripe checkout session, PayPal order ID
    gateway_event_id TEXT, -- Webhook event ID
    
    -- Amount
    currency TEXT DEFAULT 'USD',
    price DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    amount DECIMAL(10,2) NOT NULL,
    
    -- Item purchased
    item_ids TEXT,
    item_name TEXT,
    
    -- Status
    redirect_status TEXT, -- 'success', 'failed', 'pending'
    callback_status TEXT, -- 'success', 'failed', 'pending'
    
    -- Display settings
    visible_for_user BOOLEAN DEFAULT TRUE,
    generate_invoice BOOLEAN DEFAULT TRUE,
    
    -- Discounts
    coupon TEXT,
    coupon_discount DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    
    -- Additional data
    description TEXT,
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    callback_at TIMESTAMPTZ,
    
    -- Legacy flag
    is_legacy BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_gateway ON public.payment_history(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON public.payment_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_legacy_id ON public.payment_history(legacy_id);

-- RLS policies
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY "Users can view own payment history" ON public.payment_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "Service role can manage payment history" ON public.payment_history
    FOR ALL
    USING (auth.role() = 'service_role');

COMMENT ON TABLE public.payment_history IS 'Transaction and invoice history';

