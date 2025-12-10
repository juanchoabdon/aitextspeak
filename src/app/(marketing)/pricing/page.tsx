import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PricingCards } from '@/components/pricing/PricingCards';
import { getUserActiveSubscription } from '@/lib/payments/subscription';
import type { PlanId } from '@/lib/payments/plans';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

export const metadata: Metadata = {
  title: 'Pricing & Plans - AI TextSpeak | Free TTS & Premium Options',
  description: 'Choose the perfect AI text-to-speech plan. Start free with 5,000 chars/month or upgrade for unlimited voices, 50+ languages & priority support. Plans from $10/mo.',
  keywords: [
    'text to speech pricing',
    'TTS subscription',
    'AI voice generator cost',
    'free text to speech',
    'voiceover pricing',
  ],
  alternates: {
    canonical: `${SITE_URL}/pricing`,
  },
  openGraph: {
    title: 'Pricing & Plans - AI TextSpeak',
    description: 'Start free or upgrade for unlimited AI text-to-speech. Plans from $10/month.',
    url: `${SITE_URL}/pricing`,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI TextSpeak Pricing - Free & Premium Plans',
    description: 'Start free or upgrade for unlimited AI text-to-speech.',
  },
};

const plans: {
  name: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  planId: PlanId;
  popular?: boolean;
}[] = [
  {
    name: 'FREE PLAN',
    subtitle: 'One-Time Payment',
    price: '$0.00',
    period: '',
    features: [
      'Get it When You Sign Up',
      '500 Character Limit',
      'Standard Voice and A.I Voices',
    ],
    planId: 'free',
    popular: false,
  },
  {
    name: 'MONTHLY PLAN',
    subtitle: 'Recurring every 1 month',
    price: '$10',
    period: '/ mo',
    features: [
      'Pay Monthly',
      '1 Million Character',
      'Standard & Neural Voices Included',
      'Cancel Anytime',
    ],
    planId: 'monthly',
    popular: false,
  },
  {
    name: 'MONTHLY PRO PLAN',
    subtitle: 'Recurring every 6 month',
    price: '$30',
    period: '/ mo',
    features: [
      'Standard & A.I Voices',
      'Unlimited Characters',
      'Unlimited Storage',
      'Commercial Usage',
      'Cancel Anytime',
    ],
    planId: 'monthly_pro',
    popular: true,
  },
  {
    name: 'LIFETIME PACKAGE',
    subtitle: 'One-Time Payment',
    price: '$99',
    period: '/ Lifetime',
    features: [
      'Pay once, Use lifetime',
      'Include All Standard Voices',
      'Unlimited Characters',
      'Unlimited Storage',
      'Commercial Rights',
      '30 Day Money Back Guarantee',
    ],
    planId: 'lifetime',
    popular: false,
  },
];

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isLoggedIn = !!user;
  
  // Get user's current plan (only if logged in)
  let currentPlanId: PlanId | null = null;
  if (user) {
    const subscription = await getUserActiveSubscription(user.id);
    currentPlanId = subscription.planId;
  }

  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. Start free and upgrade as you grow.
          </p>
          
          {/* Current Plan Badge */}
          {isLoggedIn && currentPlanId && (
            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700">
              <span className="text-slate-400">Your current plan:</span>
              <span className="font-semibold text-amber-400 capitalize">
                {currentPlanId === 'monthly_pro' ? 'Monthly Pro' : currentPlanId}
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <PricingCards 
          plans={plans} 
          isLoggedIn={isLoggedIn} 
          currentPlanId={currentPlanId} 
        />

        {/* FAQ Section */}
        <div className="mt-24">
          <h2 className="text-center text-3xl font-bold text-white">
            Frequently Asked Questions
          </h2>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-white">Can I cancel anytime?</h3>
              <p className="mt-2 text-slate-400">
                Yes, you can cancel your subscription at any time. You&apos;ll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">What payment methods do you accept?</h3>
              <p className="mt-2 text-slate-400">
                We accept all major credit cards and PayPal. All payments are processed securely.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">What&apos;s included in the Lifetime Package?</h3>
              <p className="mt-2 text-slate-400">
                The Lifetime Package is a one-time payment that gives you unlimited access forever. It includes all standard voices, unlimited characters, and commercial rights.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Do you offer refunds?</h3>
              <p className="mt-2 text-slate-400">
                The Lifetime Package comes with a 30-day money back guarantee. Monthly subscriptions can be canceled anytime but are not refundable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
