import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us - AI TextSpeak',
  description: 'Get in touch with the AI TextSpeak team. We\'re here to help with any questions about our text-to-speech platform.',
  openGraph: {
    title: 'Contact Us - AI TextSpeak',
    description: 'Get in touch with the AI TextSpeak team.',
    url: 'https://aitextspeak.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Get In Touch
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Have a question or need help? We&apos;d love to hear from you.
          </p>
        </div>

        {/* Contact Form */}
        <form className="mt-12 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-300">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="John"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-slate-300">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-300">
              Subject
            </label>
            <select
              id="subject"
              name="subject"
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select a topic</option>
              <option value="general">General Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="billing">Billing Question</option>
              <option value="partnership">Partnership Opportunity</option>
              <option value="affiliate">Affiliate Program</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-300">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={6}
              className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="How can we help you?"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/30 hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              Send Message
            </button>
          </div>
        </form>

        {/* Alternative Contact */}
        <div className="mt-16 text-center">
          <p className="text-slate-400">
            You can also reach us directly at{' '}
            <a href="mailto:support@aitextspeak.com" className="text-amber-500 hover:text-amber-400">
              support@aitextspeak.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

