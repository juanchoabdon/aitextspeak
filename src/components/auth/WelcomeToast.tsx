'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Shows a welcome toast for new users after OAuth signup.
 * Triggered by ?new_user=1 in the URL.
 */
export function WelcomeToast() {
  const searchParams = useSearchParams();
  const hasShownToast = useRef(false);

  useEffect(() => {
    const isNewUser = searchParams.get('new_user') === '1';
    
    if (isNewUser && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.success('Welcome to AI TextSpeak! 🎉', {
        description: 'Your account is ready. Start creating amazing voiceovers!',
        duration: 5000,
      });
    }
  }, [searchParams]);

  return null;
}

