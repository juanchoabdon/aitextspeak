-- Add new fields to subscriptions table for complete payment tracking
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS plan_id text,
ADD COLUMN IF NOT EXISTS plan_name text,
ADD COLUMN IF NOT EXISTS price_amount numeric(10,2),
ADD COLUMN IF NOT EXISTS price_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS billing_interval text, -- 'month', 'year', or null for lifetime
ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
ADD COLUMN IF NOT EXISTS cancel_at timestamptz,
ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- Update the status enum to include more states
DO $$
BEGIN
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'past_due';
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'trialing';
    ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'incomplete';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Add unique constraint for user + provider (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'subscriptions_user_provider_unique'
    ) THEN
        ALTER TABLE subscriptions 
        ADD CONSTRAINT subscriptions_user_provider_unique 
        UNIQUE (user_id, provider);
    END IF;
END $$;

-- Note: profiles.role is a TEXT field, not an enum
-- Values can be: 'user', 'pro', 'admin'

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_subscription 
ON subscriptions(provider_subscription_id);

