'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PricingCard } from './PricingCard';
import type { PlanId, AllPlanId } from '@/lib/payments/plans';
import { trackCheckoutStarted, trackPaymentError, trackPlanSelected } from '@/lib/analytics/events';

interface Plan {
  name: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  planId: PlanId;
  popular?: boolean;
}

interface PricingCardsProps {
  plans: Plan[];
  isLoggedIn: boolean;
  currentPlanId: AllPlanId | null; // Can include legacy plans
}

export function PricingCards({ plans, isLoggedIn, currentPlanId }: PricingCardsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanId | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  useEffect(() => {
    const checkout = searchParams.get('checkout') as PlanId | null;
    
    // If user just signed up and there's a checkout param, show payment method modal
    if (checkout && isLoggedIn && checkout !== 'free' && !showPaymentModal && !isProcessingCheckout) {
      setCheckoutPlanId(checkout);
      setShowPaymentModal(true);
      
      // Track plan selected
      const plan = plans.find(p => p.planId === checkout);
      if (plan) {
        trackPlanSelected(checkout, plan.price);
      }
      
      // Clear the checkout param from URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('checkout');
      router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, isLoggedIn, router, showPaymentModal, isProcessingCheckout, plans]);

  const handleCheckout = async (provider: 'stripe' | 'paypal') => {
    if (!checkoutPlanId) return;
    
    // Track checkout started
    trackCheckoutStarted(checkoutPlanId, provider);
    
    setIsProcessingCheckout(true);
    setShowPaymentModal(false);
    
    try {
      const response = await fetch(`/api/checkout/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId: checkoutPlanId }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Checkout error:', data.error);
        trackPaymentError({
          planId: checkoutPlanId,
          provider,
          errorMessage: data.error,
          step: 'checkout',
        });
        alert(data.error);
        setIsProcessingCheckout(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      trackPaymentError({
        planId: checkoutPlanId,
        provider,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        step: 'checkout',
      });
      alert('Failed to start checkout. Please try again.');
      setIsProcessingCheckout(false);
    }
  };

  const selectedPlan = plans.find(p => p.planId === checkoutPlanId);

  return (
    <>
      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Complete Your Purchase</h3>
              <p className="mt-2 text-slate-400">
                You selected the <span className="text-amber-400 font-semibold">{selectedPlan.name}</span> for{' '}
                <span className="text-white font-semibold">{selectedPlan.price}{selectedPlan.period}</span>
              </p>
            </div>

            <p className="text-center text-slate-300 mb-6">Choose your payment method:</p>

            <div className="space-y-3">
              <button
                onClick={() => handleCheckout('stripe')}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-slate-800 py-4 text-center font-semibold text-white transition-colors hover:bg-slate-700 cursor-pointer"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                </svg>
                Pay with Card
              </button>
              
              <button
                onClick={() => handleCheckout('paypal')}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0070ba] py-4 text-center font-semibold text-white transition-colors hover:bg-[#005ea6] cursor-pointer"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603a.925.925 0 0 0-.913.77l-.823 5.23-.183 1.16a.64.64 0 0 1-.632.548l.024-.002z" />
                  <path d="M20.563 6.147c-.04.258-.09.524-.15.8-1.232 6.32-5.449 8.514-10.84 8.514H7.097a1.15 1.15 0 0 0-1.136.977l-1.192 7.558a.57.57 0 0 0 .564.66h3.956c.42 0 .776-.308.84-.725l.034-.18.667-4.227.043-.233a.85.85 0 0 1 .84-.725h.528c3.428 0 6.114-1.393 6.899-5.423.328-1.683.158-3.086-.71-4.073a3.4 3.4 0 0 0-.867-.703z" />
                </svg>
                Pay with PayPal
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              🔒 Secure payment powered by Stripe & PayPal
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay when processing checkout */}
      {isProcessingCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-white text-lg font-semibold">Redirecting to checkout...</p>
            <p className="text-slate-400 mt-2">Please wait while we set up your payment.</p>
          </div>
        </div>
      )}
      
      <div className="mt-16 grid gap-8 lg:grid-cols-4 md:grid-cols-2">
        {plans.map((plan) => (
          <PricingCard
            key={plan.planId}
            name={plan.name}
            subtitle={plan.subtitle}
            price={plan.price}
            period={plan.period}
            features={plan.features}
            planId={plan.planId}
            popular={plan.popular}
            isLoggedIn={isLoggedIn}
            isCurrentPlan={isLoggedIn && plan.planId === currentPlanId}
          />
        ))}
      </div>
    </>
  );
}








