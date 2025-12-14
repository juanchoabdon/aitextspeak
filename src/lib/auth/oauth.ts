'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Sign in with Google OAuth
 * 
 * IMPORTANT: Make sure to configure redirect URLs in Supabase Dashboard:
 * 1. Go to Supabase Dashboard > Authentication > URL Configuration
 * 2. Add your production URL: https://aitextspeak.com/auth/callback
 * 3. Add your localhost URL for development: http://localhost:3000/auth/callback
 * 
 * Also ensure NEXT_PUBLIC_SITE_URL is set in your production environment variables.
 */
export async function signInWithGoogle() {
  const supabase = createClient();
  
  // Use environment variable if available, otherwise fall back to window.location.origin
  // This ensures production uses the correct URL even if window.location is incorrect
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const redirectTo = `${baseUrl}/auth/callback`;
  
  console.log('[OAuth] Using redirect URL:', redirectTo);
  console.log('[OAuth] Environment check - NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'not set');
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}









