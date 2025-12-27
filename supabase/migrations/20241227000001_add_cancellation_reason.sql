-- Add cancellation reason columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_feedback TEXT,
ADD COLUMN IF NOT EXISTS cancellation_comment TEXT;

-- Add comment explaining the fields
COMMENT ON COLUMN subscriptions.cancellation_reason IS 'Reason for cancellation: cancellation_requested, payment_failed, payment_disputed, etc.';
COMMENT ON COLUMN subscriptions.cancellation_feedback IS 'Customer feedback: too_expensive, missing_features, switched_service, unused, customer_service, too_complex, low_quality, other';
COMMENT ON COLUMN subscriptions.cancellation_comment IS 'Free-form customer comment about cancellation';

