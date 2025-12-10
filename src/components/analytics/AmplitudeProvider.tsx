'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { initAmplitude, trackPageView } from '@/lib/analytics/amplitude';
import { trackSignupCompleted, trackLoginCompleted } from '@/lib/analytics/events';

/**
 * Amplitude Analytics Provider
 * Initializes Amplitude and tracks page views on route changes
 */
export function AmplitudeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasTrackedOAuth = useRef(false);

  // Initialize Amplitude on mount
  useEffect(() => {
    initAmplitude();
  }, []);

  // Track OAuth completion from callback redirect
  useEffect(() => {
    if (hasTrackedOAuth.current) return;
    
    const oauth = searchParams.get('oauth');
    const newUser = searchParams.get('new_user');
    const userId = searchParams.get('user_id');
    
    if (oauth === 'google' && userId) {
      hasTrackedOAuth.current = true;
      
      if (newUser === '1') {
        // New user signed up via Google
        trackSignupCompleted(userId, 'google');
      } else {
        // Existing user logged in via Google
        trackLoginCompleted(userId, 'google');
      }
      
      // Clean up the URL by removing tracking params
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('oauth');
      newSearchParams.delete('new_user');
      newSearchParams.delete('user_id');
      
      const newUrl = newSearchParams.toString() 
        ? `${pathname}?${newSearchParams.toString()}`
        : pathname;
      
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router]);

  // Track page views on route changes
  useEffect(() => {
    // Build full URL with search params (excluding tracking params)
    const cleanParams = new URLSearchParams(searchParams.toString());
    cleanParams.delete('oauth');
    cleanParams.delete('new_user');
    cleanParams.delete('user_id');
    
    const url = cleanParams.toString()
      ? `${pathname}?${cleanParams.toString()}`
      : pathname;

    // Track page view
    trackPageView(undefined, {
      page_path: pathname,
      page_url: url,
      referrer: document.referrer || undefined,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
