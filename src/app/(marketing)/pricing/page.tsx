import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Pricing - AI TextSpeak',
  description: 'Choose the perfect plan for your text-to-speech needs. Start free and upgrade as you grow.',
  openGraph: {
    title: 'Pricing - AI TextSpeak',
    description: 'Choose the perfect plan for your text-to-speech needs.',
    url: 'https://aitextspeak.com/pricing',
  },
};

const plans = [
  {
    name: 'Free',
    description: 'Perfect for trying out AI TextSpeak',
    price: '$0',
    period: 'forever',
    features: [
      '5,000 characters/month',
      '10 voice options',
      'Standard quality audio',
      'MP3 downloads',
      'Community support',
    ],
    cta: 'Get Started',
    href: '/auth/signup',
    popular: false,
  },
  {
    name: 'Pro',
    description: 'For content creators and professionals',
    price: '$19',
    period: '/month',
    features: [
      '100,000 characters/month',
      '50+ voice options',
      'HD quality audio',
      'MP3 & WAV downloads',
      'Priority support',
      'Commercial license',
      'Custom voice settings',
    ],
    cta: 'Start Pro Trial',
    href: '/auth/signup?plan=pro',
    popular: true,
  },
  {
    name: 'Business',
    description: 'For teams and high-volume users',
    price: '$79',
    period: '/month',
    features: [
      'Unlimited characters',
      'All 100+ voices',
      'Ultra HD quality audio',
      'All audio formats',
      'Dedicated support',
      'API access',
      'Team management',
      'Custom voice cloning',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include our core features.
            Upgrade or downgrade anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border ${
                plan.popular
                  ? 'border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent'
                  : 'border-slate-800 bg-slate-900/50'
              } p-8`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-1 text-sm font-medium text-white">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-white">{plan.price}</span>
                  <span className="text-slate-400">{plan.period}</span>
                </div>
              </div>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Link
                  href={plan.href}
                  className={`block w-full rounded-xl py-3 text-center font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500'
                      : 'border border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            </div>
          ))}
        </div>

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
                We accept all major credit cards, debit cards, and PayPal. All payments are processed securely.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Is there a free trial?</h3>
              <p className="mt-2 text-slate-400">
                Yes! Our Free plan gives you 5,000 characters per month to try out the service. Pro plans also come with a 7-day free trial.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Can I use the audio commercially?</h3>
              <p className="mt-2 text-slate-400">
                Pro and Business plans include a full commercial license. You can use the generated audio for YouTube, podcasts, courses, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

