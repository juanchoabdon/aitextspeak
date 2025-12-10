'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { UserSubscription } from '@/lib/payments/subscription';

interface BillingClientProps {
  subscription: {
    provider?: string | null;
    provider_customer_id?: string | null;
    provider_subscription_id?: string | null;
    status?: string | null;
  } | null;
  profile: {
    id?: string;
    email?: string | null;
    role?: string | null;
  } | null;
  userSubscription?: UserSubscription;
}

export function BillingClient({ subscription, profile, userSubscription }: BillingClientProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageStripeSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManagePayPalSubscription = () => {
    // PayPal subscription management URL
    const subscriptionId = subscription?.provider_subscription_id;
    
    if (subscriptionId && subscriptionId.startsWith('I-')) {
      // Direct link to manage specific subscription
      window.open(`https://www.paypal.com/myaccount/autopay/connect/${subscriptionId}`, '_blank');
    } else {
      // Fallback to general autopay management
      window.open('https://www.paypal.com/myaccount/autopay/', '_blank');
    }
  };

  const isActive = userSubscription?.isActive && userSubscription?.provider !== 'free';
  const provider = userSubscription?.provider || subscription?.provider;

  if (isActive) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Stripe Management */}
          {provider === 'stripe' && (
            <button
              onClick={handleManageStripeSubscription}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 px-6 font-semibold text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                  </svg>
                  Manage Subscription
                </span>
              )}
            </button>
          )}

          {/* PayPal Management */}
          {(provider === 'paypal' || provider === 'paypal_legacy') && (
            <button
              onClick={handleManagePayPalSubscription}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 px-6 font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603a.925.925 0 0 0-.913.77l-.823 5.23-.183 1.16a.64.64 0 0 1-.632.548l.024-.002z" />
                  <path d="M20.563 6.147c-.04.258-.09.524-.15.8-1.232 6.32-5.449 8.514-10.84 8.514H7.097a1.15 1.15 0 0 0-1.136.977l-1.192 7.558a.57.57 0 0 0 .564.66h3.956c.42 0 .776-.308.84-.725l.034-.18.667-4.227.043-.233a.85.85 0 0 1 .84-.725h.528c3.428 0 6.114-1.393 6.899-5.423.328-1.683.158-3.086-.71-4.073a3.4 3.4 0 0 0-.867-.703z" />
                </svg>
                Manage on PayPal
              </span>
            </button>
          )}
          
          <Link
            href="/pricing"
            className="flex-1 rounded-xl border border-amber-500/50 bg-transparent py-3 px-6 font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors text-center"
          >
            Change Plan
          </Link>
        </div>

      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <Link
        href="/pricing"
        className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 px-6 font-semibold text-black hover:from-amber-400 hover:to-orange-400 transition-all text-center"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
