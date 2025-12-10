-- ============================================
-- Function to update user password hash directly
-- Used for legacy user migration
-- ============================================

-- This function allows setting a bcrypt password hash directly
-- Only callable by service_role (admin)
CREATE OR REPLACE FUNCTION public.set_user_password_hash(
  target_user_id UUID,
  new_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Only allow service_role to call this
  IF auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Only service_role can update password hashes';
  END IF;

  -- Update the encrypted_password in auth.users
  UPDATE auth.users
  SET encrypted_password = new_password_hash
  WHERE id = target_user_id;

  RETURN FOUND;
END;
$$;

-- Grant execute to service_role only
REVOKE ALL ON FUNCTION public.set_user_password_hash FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_password_hash TO service_role;

COMMENT ON FUNCTION public.set_user_password_hash IS 'Updates user password hash directly - for legacy migration only';

