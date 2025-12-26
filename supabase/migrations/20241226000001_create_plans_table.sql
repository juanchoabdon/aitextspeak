-- Create plans table to store all available plans (active and discovered)
-- This allows us to track plans from payment providers that may not be in code

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_amount INTEGER NOT NULL DEFAULT 0, -- in cents
  price_currency TEXT NOT NULL DEFAULT 'USD',
  billing_interval TEXT, -- 'month', 'year', 'one_time', null for free
  characters_per_month INTEGER DEFAULT 0, -- -1 for unlimited
  stripe_price_id TEXT,
  paypal_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_legacy BOOLEAN NOT NULL DEFAULT false,
  is_discovered BOOLEAN NOT NULL DEFAULT false, -- true if auto-discovered from provider
  features JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_plans_stripe_price_id ON plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plans_paypal_plan_id ON plans(paypal_plan_id) WHERE paypal_plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

-- Insert default plans from code
INSERT INTO plans (id, name, description, price_amount, price_currency, billing_interval, characters_per_month, stripe_price_id, paypal_plan_id, is_active, is_legacy, features)
VALUES 
  ('free', 'Free', 'Get started with basic features', 0, 'USD', NULL, 500, NULL, NULL, true, false, '["500 characters/month", "English voices only", "MP3 downloads", "Email support"]'),
  ('monthly', 'Basic Plan', 'Perfect for content creators', 999, 'USD', 'month', 1000000, 'price_1Qw4L1H0TRmuwyMeDVGmXbyH', NULL, true, false, '["1 Million characters/month", "All languages & voices", "Priority processing", "Commercial license", "Cancel Anytime"]'),
  ('monthly_pro', 'Monthly Pro', 'For professionals and teams', 2999, 'USD', 'month', -1, 'price_1KNQX5H0TRmuwyMeu1ksWv1O', NULL, true, false, '["Unlimited characters", "All languages & premium voices", "Priority processing", "Commercial license", "Unlimited Storage", "Cancel Anytime"]'),
  ('lifetime', 'Lifetime', 'One-time payment, forever access', 9900, 'USD', 'one_time', -1, 'price_1SZPRHH0TRmuwyMewRDFh67q', NULL, true, false, '["Pay once, Use lifetime", "All languages & voices", "Unlimited characters", "Unlimited Storage", "Commercial Rights", "30 Day Money Back Guarantee"]'),
  ('pro_annual', '6 Month Package', '6-month pro subscription (Legacy)', 2999, 'USD', 'year', 5000000, NULL, NULL, false, true, '["30 Million characters over 6 months", "All languages & premium voices", "Priority processing", "Commercial license", "Billed every 6 months"]'),
  ('basic_annual', 'Basic Annual', 'Annual basic subscription (Legacy)', 5994, 'USD', 'year', 1000000, NULL, NULL, false, true, '["12 Million characters/year", "All languages & voices", "Priority processing", "Commercial license", "Billed annually"]')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_amount = EXCLUDED.price_amount,
  stripe_price_id = COALESCE(EXCLUDED.stripe_price_id, plans.stripe_price_id),
  paypal_plan_id = COALESCE(EXCLUDED.paypal_plan_id, plans.paypal_plan_id),
  updated_at = NOW();

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read plans (they're public)
CREATE POLICY "Plans are publicly readable" ON plans
  FOR SELECT USING (true);

-- Only admins can modify plans (via service role)
CREATE POLICY "Only service role can modify plans" ON plans
  FOR ALL USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plans_updated_at();

COMMENT ON TABLE plans IS 'Stores all subscription plans including those discovered from payment providers';
COMMENT ON COLUMN plans.is_discovered IS 'True if this plan was auto-discovered from Stripe/PayPal (not defined in code)';

