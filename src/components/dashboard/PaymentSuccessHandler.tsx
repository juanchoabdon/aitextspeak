'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

interface PaymentSuccessHandlerProps {
  userId: string;
}

export function PaymentSuccessHandler({ userId }: PaymentSuccessHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasHandled = useRef(false);

  useEffect(() => {
    if (hasHandled.current) return;

    const payment = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    const provider = searchParams.get('provider');

    if (payment === 'success') {
      hasHandled.current = true;

      // Activate Stripe session if present
      if (sessionId) {
        activateStripeSession(sessionId, userId);
      }

      // Show success toast
      const providerName = provider === 'paypal' ? 'PayPal' : 'Stripe';
      toast.success('Payment Successful! 🎉', {
        description: `Your subscription has been activated via ${providerName}. You now have access to all Pro features.`,
        duration: 6000,
      });

      // Clean up URL params without refresh
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      url.searchParams.delete('session_id');
      url.searchParams.delete('provider');
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, userId, router]);

  return null;
}

async function activateStripeSession(sessionId: string, userId: string) {
  try {
    // Call API to activate the subscription
    const response = await fetch('/api/checkout/stripe/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, userId }),
    });

    if (!response.ok) {
      console.error('Failed to activate Stripe session:', await response.text());
    }
  } catch (error) {
    console.error('Error activating Stripe session:', error);
  }
}

