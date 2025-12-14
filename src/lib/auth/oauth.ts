'use client';

import { createClient } from '@/lib/supabase/client';

export async function signInWithGoogle() {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
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









