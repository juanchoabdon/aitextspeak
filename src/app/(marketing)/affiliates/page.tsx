import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Affiliate Program - AI TextSpeak',
  description: 'Earn money promoting AI TextSpeak. Join our affiliate program and earn up to 30% commission on every referral.',
  openGraph: {
    title: 'Affiliate Program - AI TextSpeak',
    description: 'Earn up to 30% commission promoting AI TextSpeak.',
    url: 'https://aitextspeak.com/affiliates',
  },
};

export default function AffiliatesPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Earn With Our{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Affiliate Program
            </span>
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Promote AI TextSpeak and earn up to 30% recurring commission on every customer you refer.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/30 hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              Apply Now
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500/20 to-orange-600/20">
              <span className="text-3xl font-bold text-amber-500">30%</span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">High Commissions</h3>
            <p className="mt-2 text-slate-400">
              Earn up to 30% on every sale, including recurring subscriptions.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500/20 to-orange-600/20">
              <span className="text-3xl">🔄</span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Recurring Revenue</h3>
            <p className="mt-2 text-slate-400">
              Earn commission for as long as your referrals stay subscribed.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500/20 to-orange-600/20">
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-white">Fast Payouts</h3>
            <p className="mt-2 text-slate-400">
              Get paid monthly via PayPal or bank transfer. Low minimum threshold.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <h2 className="text-center text-3xl font-bold text-white">How It Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Apply</h3>
              <p className="mt-2 text-sm text-slate-400">
                Fill out our simple application form and tell us about your audience.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Get Approved</h3>
              <p className="mt-2 text-sm text-slate-400">
                We&apos;ll review your application and get back to you within 48 hours.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Promote</h3>
              <p className="mt-2 text-sm text-slate-400">
                Share your unique affiliate link with your audience and create content.
              </p>
            </div>
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
                4
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Earn</h3>
              <p className="mt-2 text-sm text-slate-400">
                Track your referrals and earn commission on every conversion.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-center text-3xl font-bold text-white">Common Questions</h2>
          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white">Who can become an affiliate?</h3>
              <p className="mt-2 text-slate-400">
                Anyone with an audience interested in content creation, AI tools, or digital marketing can apply.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white">How long is the cookie duration?</h3>
              <p className="mt-2 text-slate-400">
                We use a 90-day cookie, giving you credit for conversions up to 3 months after the initial click.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white">What&apos;s the minimum payout?</h3>
              <p className="mt-2 text-slate-400">
                The minimum payout threshold is $50. Payments are processed on the 15th of each month.
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <h3 className="text-lg font-semibold text-white">Do you provide marketing materials?</h3>
              <p className="mt-2 text-slate-400">
                Yes! We provide banners, email templates, and promotional content to help you succeed.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Start Earning?</h2>
          <p className="mt-4 text-lg text-slate-400">
            Join our affiliate program today and start earning recurring commissions.
          </p>
          <div className="mt-8">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/30 hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              Apply Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

