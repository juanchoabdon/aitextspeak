import type { Metadata } from 'next';
import { HelpTicketForm } from '@/components/help/HelpTicketForm';
import { FAQJsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

export const metadata: Metadata = {
  title: 'Help Center & Support | AI TextSpeak FAQ',
  description: 'Get help with AI TextSpeak. Find answers to common questions about text-to-speech, voices, pricing, and more. Contact our support team for assistance.',
  keywords: ['AI TextSpeak support', 'text to speech help', 'TTS FAQ', 'voice generator help'],
  alternates: {
    canonical: `${SITE_URL}/help`,
  },
  openGraph: {
    title: 'Help & Support - AI TextSpeak',
    description: 'Get help with AI TextSpeak. FAQ and support tickets.',
    url: `${SITE_URL}/help`,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Help & Support - AI TextSpeak',
    description: 'Get help with AI TextSpeak. FAQ and support tickets.',
  },
};

const FAQ_ITEMS = [
  {
    question: 'How do I get started?',
    answer: 'Simply sign up for a free account, create a new project, enter your text, select a voice, and generate your audio. It\'s that easy!',
  },
  {
    question: 'What voices are available?',
    answer: 'We offer 100+ AI voices across 50+ languages, including natural-sounding male and female voices with various accents and styles.',
  },
  {
    question: 'How many characters can I use?',
    answer: 'Free users get 500 characters per month. Our paid plans offer 50,000 to unlimited characters depending on your subscription.',
  },
  {
    question: 'Can I use the audio commercially?',
    answer: 'Yes! All paid plans include a commercial license. You can use your generated audio for YouTube, podcasts, audiobooks, and more.',
  },
  {
    question: 'How do I cancel my subscription?',
    answer: 'You can cancel anytime from your Billing page in the dashboard. Your access will continue until the end of your billing period.',
  },
  {
    question: 'What audio formats are supported?',
    answer: 'We generate high-quality MP3 files that are compatible with all major platforms and editing software.',
  },
];

export default function HelpPage() {
  return (
    <>
      <FAQJsonLd questions={FAQ_ITEMS} />
      
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            How Can We Help?
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Browse our FAQ or submit a support ticket. We typically respond within 24 hours.
          </p>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          {/* FAQ Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item, index) => (
                <details
                  key={index}
                  className="group rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between p-5 text-white font-medium hover:bg-slate-800/50 transition-colors">
                    {item.question}
                    <svg
                      className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 text-slate-400">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>

            {/* Quick Links */}
            <div className="mt-8 p-6 rounded-xl border border-slate-800 bg-slate-900/50">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
              <ul className="space-y-3">
                <li>
                  <a href="/pricing" className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    View Pricing Plans
                  </a>
                </li>
                <li>
                  <a href="/dashboard/billing" className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Manage Billing
                  </a>
                </li>
                <li>
                  <a href="/terms-of-service" className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy-policy" className="flex items-center gap-2 text-slate-400 hover:text-amber-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Ticket Form */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Submit a Support Ticket
            </h2>
            <HelpTicketForm />
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-16 text-center">
          <p className="text-slate-400">
            Need immediate assistance? Email us at{' '}
            <a href="mailto:support@aitextspeak.com" className="text-amber-500 hover:text-amber-400">
              support@aitextspeak.com
            </a>
          </p>
        </div>
      </div>
    </div>
    </>
  );
}
