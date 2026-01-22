-- Add device fingerprint tracking to prevent multiple free account abuse
-- This stores a device ID generated on the client to detect repeat offenders

-- Add device_id column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Add is_suspicious flag for flagged accounts
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT FALSE;

-- Add device_account_count to track how many accounts from same device
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS device_account_count INTEGER DEFAULT 1;

-- Create index for faster device_id lookups
CREATE INDEX IF NOT EXISTS idx_profiles_device_id ON profiles(device_id) WHERE device_id IS NOT NULL;

-- Create index for suspicious accounts
CREATE INDEX IF NOT EXISTS idx_profiles_suspicious ON profiles(is_suspicious) WHERE is_suspicious = TRUE;

COMMENT ON COLUMN profiles.device_id IS 'Client-generated device fingerprint to detect multiple free accounts';
COMMENT ON COLUMN profiles.is_suspicious IS 'Flag for accounts suspected of abuse (multiple free accounts)';
COMMENT ON COLUMN profiles.device_account_count IS 'Number of accounts created from the same device_id';

