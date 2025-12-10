'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PlanId } from '@/lib/payments/plans';

interface PricingCardProps {
  name: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  planId: PlanId;
  popular?: boolean;
  isLoggedIn: boolean;
  isCurrentPlan?: boolean;
}

export function PricingCard({
  name,
  subtitle,
  price,
  period,
  features,
  planId,
  popular,
  isLoggedIn,
  isCurrentPlan = false,
}: PricingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const router = useRouter();

  const handleCheckout = async (provider: 'stripe' | 'paypal') => {
    if (!isLoggedIn) {
      router.push(`/auth/signup?plan=${planId}`);
      return;
    }

    if (planId === 'free') {
      router.push('/dashboard');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/checkout/${provider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (data.error) {
        console.error('Checkout error:', data.error);
        alert(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStarted = () => {
    if (planId === 'free') {
      if (isLoggedIn) {
        router.push('/dashboard');
      } else {
        router.push('/auth/signup');
      }
      return;
    }

    if (!isLoggedIn) {
      router.push(`/auth/signup?plan=${planId}`);
      return;
    }

    setShowPaymentOptions(true);
  };

  return (
    <div
      className={`relative rounded-2xl border ${
        isCurrentPlan
          ? 'border-green-500 bg-gradient-to-b from-green-500/10 to-transparent ring-2 ring-green-500/20'
          : popular
          ? 'border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent'
          : 'border-slate-800 bg-slate-900/50'
      } p-8 flex flex-col`}
    >
      {isCurrentPlan ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-green-500 px-4 py-1 text-sm font-medium text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Current Plan
          </span>
        </div>
      ) : popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-1 text-sm font-medium text-white">
            Most Popular
          </span>
        </div>
      )}

      <div>
        <p className={`text-sm font-semibold uppercase tracking-wide ${
          popular ? 'text-amber-500' : 'text-violet-500'
        }`}>
          {name}
        </p>
        <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        
        <div className="mt-6">
          <span className="text-5xl font-bold text-white">{price}</span>
          {period && (
            <span className="text-slate-400">{period}</span>
          )}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-6 flex-1">
        <ul className="space-y-4">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <svg
                className="h-5 w-5 text-violet-500 mt-0.5 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="text-slate-300 text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        {isCurrentPlan ? (
          <div className="w-full rounded-lg py-3 text-center font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            ✓ Your Current Plan
          </div>
        ) : !showPaymentOptions ? (
          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            className={`block w-full rounded-lg py-3 text-center font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              popular
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500'
                : 'bg-violet-600 text-white hover:bg-violet-500'
            }`}
          >
            {isLoading ? 'Loading...' : 'Get Started'}
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleCheckout('stripe')}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 py-3 text-center font-semibold text-white transition-colors cursor-pointer hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z" />
                </svg>
              )}
              Pay with Card
            </button>
            
            <button
              onClick={() => handleCheckout('paypal')}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0070ba] py-3 text-center font-semibold text-white transition-colors cursor-pointer hover:bg-[#005ea6] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797H9.603a.925.925 0 0 0-.913.77l-.823 5.23-.183 1.16a.64.64 0 0 1-.632.548l.024-.002z" />
                  <path d="M20.563 6.147c-.04.258-.09.524-.15.8-1.232 6.32-5.449 8.514-10.84 8.514H7.097a1.15 1.15 0 0 0-1.136.977l-1.192 7.558a.57.57 0 0 0 .564.66h3.956c.42 0 .776-.308.84-.725l.034-.18.667-4.227.043-.233a.85.85 0 0 1 .84-.725h.528c3.428 0 6.114-1.393 6.899-5.423.328-1.683.158-3.086-.71-4.073a3.4 3.4 0 0 0-.867-.703z" />
                </svg>
              )}
              Pay with PayPal
            </button>
            
            <button
              onClick={() => setShowPaymentOptions(false)}
              className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

