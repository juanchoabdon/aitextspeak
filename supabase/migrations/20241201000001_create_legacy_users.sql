-- ============================================
-- LEGACY USERS TABLE
-- Stores migrated users from the old PHP system
-- ============================================

CREATE TABLE IF NOT EXISTS public.legacy_users (
    -- Primary key from legacy system
    legacy_id INTEGER PRIMARY KEY,
    
    -- Legacy identifiers
    legacy_ids TEXT, -- maps to 'ids' field
    username TEXT NOT NULL,
    
    -- Authentication
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- bcrypt hash ($2y$12$...)
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Profile info
    first_name TEXT,
    last_name TEXT,
    country TEXT, -- 2-char country code
    phone TEXT,
    
    -- Roles and status
    role_ids TEXT, -- comma-separated role IDs from legacy
    status SMALLINT DEFAULT 1, -- 1 = active, 0 = inactive, etc.
    
    -- Affiliate data (for future use)
    affiliate_id TEXT,
    referred_by TEXT,
    
    -- Migration tracking
    migrated BOOLEAN DEFAULT FALSE,
    migrated_at TIMESTAMPTZ,
    supabase_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    legacy_created_time TIMESTAMPTZ, -- original created_time
    legacy_updated_time TIMESTAMPTZ  -- original update_time
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_legacy_users_email ON public.legacy_users(email);
CREATE INDEX IF NOT EXISTS idx_legacy_users_username ON public.legacy_users(username);
CREATE INDEX IF NOT EXISTS idx_legacy_users_migrated ON public.legacy_users(migrated);
CREATE INDEX IF NOT EXISTS idx_legacy_users_supabase_user_id ON public.legacy_users(supabase_user_id);

-- RLS policies
ALTER TABLE public.legacy_users ENABLE ROW LEVEL SECURITY;

-- Only service role can access legacy_users (for migration)
CREATE POLICY "Service role only" ON public.legacy_users
    FOR ALL
    USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_legacy_users_updated
    BEFORE UPDATE ON public.legacy_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.legacy_users IS 'Legacy users from PHP system pending migration to Supabase Auth';

