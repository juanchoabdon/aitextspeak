-- ============================================
-- PROFILES TABLE
-- User profiles linked to Supabase Auth
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    -- Primary key matches auth.users.id
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic info
    email TEXT NOT NULL,
    username TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    
    -- Additional profile data
    avatar_url TEXT,
    country TEXT, -- 2-char country code
    phone TEXT,
    timezone TEXT,
    
    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Migration metadata
    is_legacy_user BOOLEAN DEFAULT FALSE,
    legacy_user_id INTEGER REFERENCES public.legacy_users(legacy_id),
    
    -- Feature flags / roles
    role TEXT DEFAULT 'user', -- 'user', 'pro', 'admin'
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_user_id ON public.profiles(legacy_user_id);

-- RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Service role can do everything (for migration)
CREATE POLICY "Service role full access" ON public.profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER on_profiles_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, email_verified)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.email_confirmed_at IS NOT NULL
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE public.profiles IS 'User profiles for all authenticated users';

