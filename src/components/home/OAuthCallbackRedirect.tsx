'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * Handles OAuth callback codes that land on the home page
 * Redirects to the proper /auth/callback route
 * 
 * This is a fallback in case Supabase redirects to the Site URL instead of the specific callback route
 */
export function OAuthCallbackRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  useEffect(() => {
    if (code) {
      // Redirect to the proper callback route
      const callbackUrl = `/auth/callback?code=${encodeURIComponent(code)}`;
      console.log('[OAuth] Redirecting to callback:', callbackUrl);
      router.replace(callbackUrl);
    }
  }, [code, router]);

  return null; // This component doesn't render anything
}

