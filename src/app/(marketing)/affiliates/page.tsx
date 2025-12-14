import type { Metadata } from 'next';
import Link from 'next/link';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

export const metadata: Metadata = {
  title: 'Affiliate Program - AI TextSpeak | Earn Up to 40% Commission',
  description: 'Join the AI TextSpeak affiliate program and earn up to 40% commission on first month, then 20% recurring. Promote the #1 AI voice generator for creators.',
  keywords: [
    'AI TextSpeak affiliate program',
    'affiliate marketing',
    'earn commission',
    'voice generator affiliate',
    'TTS affiliate program',
  ],
  alternates: {
    canonical: `${SITE_URL}/affiliates`,
  },
  openGraph: {
    title: 'Affiliate Program - AI TextSpeak',
    description: 'Earn up to 40% commission on first month, then 20% recurring. Join our affiliate program today.',
    url: `${SITE_URL}/affiliates`,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI TextSpeak Affiliate Program - Earn Up to 40% Commission',
    description: 'Join our affiliate program and earn recurring commissions promoting the #1 AI voice generator.',
  },
};

export default function AffiliatesPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-purple-500/20 to-transparent blur-3xl" />
          
          <div className="relative text-center max-w-4xl mx-auto">
            {/* Icon */}
            <div className="text-7xl mb-6">💰</div>
            
            {/* Title */}
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                AI TextSpeak Affiliates
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="mt-6 text-xl text-slate-300">
              Earn recurring commissions promoting the #1 AI voice generator for creators
            </p>

            {/* Commission Badge */}
            <div className="mt-8 inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">40%</div>
                <div className="text-sm text-slate-400">First Month</div>
              </div>
              <div className="h-12 w-px bg-purple-500/30" />
              <div className="text-center">
                <div className="text-3xl font-bold text-pink-400">20%</div>
                <div className="text-sm text-slate-400">Recurring</div>
              </div>
            </div>
          </div>
        </section>

        {/* Commission Structure Section */}
        <section className="mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Commission Structure
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Earn competitive commissions on every referral you bring to AI TextSpeak
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {/* First Month Commission */}
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent p-8 text-center">
              <div className="text-6xl font-bold text-purple-400 mb-4">40%</div>
              <h3 className="text-2xl font-semibold text-white mb-2">First Month</h3>
              <p className="text-slate-400">
                Earn 40% commission on the first month of every subscription you refer
              </p>
            </div>

            {/* Recurring Commission */}
            <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-transparent p-8 text-center">
              <div className="text-6xl font-bold text-pink-400 mb-4">20%</div>
              <h3 className="text-2xl font-semibold text-white mb-2">Recurring</h3>
              <p className="text-slate-400">
                Continue earning 20% commission on every recurring payment thereafter
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="mt-24 py-16 border-t border-slate-800/50">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              How It Works
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Sign Up</h3>
              <p className="text-slate-400">
                Create your affiliate account using the email of your AI TextSpeak membership account
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Share Your Link</h3>
              <p className="text-slate-400">
                Get your unique affiliate link and share it with your audience through your website, social media, or email
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Earn Commissions</h3>
              <p className="text-slate-400">
                Get paid automatically when your referrals subscribe. Track your earnings in real-time
              </p>
            </div>
          </div>
        </section>

        {/* Important Note Section */}
        <section className="mt-24">
          <div className="max-w-3xl mx-auto rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  To Make It Easier For Us
                </h3>
                <p className="text-slate-300">
                  Use the email of your AI TextSpeak membership account when signing up as an affiliate. 
                  This helps us link your affiliate account to your existing membership and ensures smooth commission tracking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Why Become an Affiliate?
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-4xl mb-4">💸</div>
              <h3 className="text-lg font-semibold text-white mb-2">High Commissions</h3>
              <p className="text-slate-400 text-sm">
                Earn up to 40% on first month and 20% recurring - one of the best rates in the industry
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-semibold text-white mb-2">Recurring Income</h3>
              <p className="text-slate-400 text-sm">
                Build a passive income stream with monthly recurring commissions
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-white mb-2">Real-Time Tracking</h3>
              <p className="text-slate-400 text-sm">
                Monitor your referrals, clicks, and earnings with detailed analytics dashboard
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-white mb-2">Easy to Promote</h3>
              <p className="text-slate-400 text-sm">
                AI TextSpeak is a proven product trusted by 50,000+ creators worldwide
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-white mb-2">Fast Payouts</h3>
              <p className="text-slate-400 text-sm">
                Get paid quickly and reliably through our automated payment system
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <div className="text-4xl mb-4">🛠️</div>
              <h3 className="text-lg font-semibold text-white mb-2">Marketing Tools</h3>
              <p className="text-slate-400 text-sm">
                Access banners, links, and promotional materials to help you succeed
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24">
          <div className="max-w-4xl mx-auto rounded-2xl border border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-12 text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
              Join thousands of affiliates already earning with AI TextSpeak. 
              Sign up today and start promoting the #1 AI voice generator for creators.
            </p>
            <Link
              href="https://affiliates.aitextspeak.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-purple-500/30 hover:from-purple-400 hover:to-pink-400 transition-all hover:scale-105"
            >
              Sign Up as Affiliate
              <svg 
                className="w-5 h-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <p className="mt-4 text-sm text-slate-400">
              You'll be redirected to our affiliate platform to complete your registration
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
