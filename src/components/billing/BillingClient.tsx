'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { UserSubscription } from '@/lib/payments/subscription';
import { CancellationModal, type CancellationReason } from './CancellationModal';
import { cancelSubscription } from '@/lib/billing/actions';
import { toast } from 'sonner';

interface BillingClientProps {
  subscription: {
    provider?: string | null;
    provider_customer_id?: string | null;
    provider_subscription_id?: string | null;
    status?: string | null;
    current_period_end?: string | null;
    plan_name?: string | null;
  } | null;
  profile?: {
    id?: string;
    email?: string | null;
    role?: string | null;
  } | null;
  userSubscription?: UserSubscription;
}

export function BillingClient({ subscription, userSubscription }: BillingClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const router = useRouter();

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
    const subscriptionId = subscription?.provider_subscription_id;
    
    if (subscriptionId && subscriptionId.startsWith('I-')) {
      window.open(`https://www.paypal.com/myaccount/autopay/connect/${subscriptionId}`, '_blank');
    } else {
      window.open('https://www.paypal.com/myaccount/autopay/', '_blank');
    }
  };

  const handleCancelSubscription = async (reason: CancellationReason, comment: string) => {
    const result = await cancelSubscription(reason, comment);
    
    if (result.success) {
      setShowCancelModal(false);
      
      if (result.periodEnd) {
        toast.success(
          `Subscription cancelled. You'll have access until ${new Date(result.periodEnd).toLocaleDateString()}.`,
          { duration: 5000 }
        );
      } else {
        toast.success('Subscription cancelled successfully.', { duration: 5000 });
      }
      
      router.refresh();
    } else {
      throw new Error(result.error || 'Failed to cancel subscription');
    }
  };

  const isActive = userSubscription?.isActive && userSubscription?.provider !== 'free';
  const provider = userSubscription?.provider || subscription?.provider;
  const hadPreviousSubscription = userSubscription?.hadPreviousSubscription;
  const status = userSubscription?.status;

  // Check if it's a lifetime subscription (can't cancel)
  const isLifetime = userSubscription?.planId === 'lifetime' || !subscription?.current_period_end;

  // Active subscription
  if (isActive) {
    return (
      <>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Stripe Management - for payment method updates */}
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
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Update Payment
                  </span>
                )}
              </button>
            )}

            {/* PayPal Management - for payment method updates */}
            {(provider === 'paypal' || provider === 'paypal_legacy') && (
              <button
                onClick={handleManagePayPalSubscription}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 px-6 font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Update Payment
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

          {/* Cancel button - only show for recurring subscriptions, not lifetime */}
          {!isLifetime && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full text-sm text-slate-500 hover:text-red-400 transition-colors py-2"
            >
              Cancel subscription
            </button>
          )}
        </div>

        {/* Cancellation Modal */}
        <CancellationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          planName={subscription?.plan_name || userSubscription?.planName || 'your plan'}
          periodEnd={subscription?.current_period_end}
        />
      </>
    );
  }

  // Canceled/Expired subscription - show renewal option
  if (hadPreviousSubscription && (status === 'canceled' || status === 'expired')) {
    return (
      <div className="flex flex-col gap-4">
        {/* Previous subscription info */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Your subscription has ended</span>
          </div>
          <p className="text-sm text-slate-400">
            Your <span className="text-white">{userSubscription?.previousPlanName}</span> subscription 
            {userSubscription?.canceledAt && (
              <> expired on <span className="text-white">{new Date(userSubscription.canceledAt).toLocaleDateString()}</span></>
            )}. 
            Renew now to continue enjoying premium features.
          </p>
        </div>

        {/* Renewal buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/pricing"
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 px-6 font-semibold text-black hover:from-amber-400 hover:to-orange-400 transition-all text-center"
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Renew Subscription
            </span>
          </Link>
        </div>
      </div>
    );
  }

  // Free user (never had a subscription)
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
