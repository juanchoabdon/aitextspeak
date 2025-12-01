import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI TextSpeak - Professional AI Text to Speech Generator',
  description: 'Transform your text into natural, human-like speech with AI TextSpeak. Create professional voiceovers for YouTube, audiobooks, podcasts, and more.',
  openGraph: {
    title: 'AI TextSpeak - Professional AI Text to Speech Generator',
    description: 'Transform your text into natural, human-like speech with AI TextSpeak.',
    url: 'https://aitextspeak.com',
    siteName: 'AI TextSpeak',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI TextSpeak - Professional AI Text to Speech Generator',
    description: 'Transform your text into natural, human-like speech with AI TextSpeak.',
  },
};

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-orange-500/20 to-transparent blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block text-white">Transform Text Into</span>
              <span className="block bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Natural Speech
              </span>
            </h1>
            
            <p className="mt-6 text-lg text-slate-300 sm:text-xl max-w-2xl mx-auto">
              Create professional voiceovers for YouTube videos, audiobooks, podcasts, 
              and more with our advanced AI text-to-speech technology.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="https://app.aitextspeak.com/auth/signup"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/30 hover:from-amber-400 hover:to-orange-500 transition-all hover:scale-105"
              >
                Start Creating Free
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 px-8 py-4 text-lg font-semibold text-white hover:bg-slate-800 transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Why Choose AI TextSpeak?
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Everything you need to create professional AI-generated voiceovers
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Natural Voices</h3>
              <p className="mt-3 text-slate-400">
                Ultra-realistic AI voices that sound like real humans. Perfect for any project.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Multiple Languages</h3>
              <p className="mt-3 text-slate-400">
                Support for 50+ languages and accents. Reach a global audience effortlessly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Lightning Fast</h3>
              <p className="mt-3 text-slate-400">
                Generate high-quality audio in seconds. No waiting, no queues.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Easy Downloads</h3>
              <p className="mt-3 text-slate-400">
                Download your audio files in MP3, WAV, or other formats instantly.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Affordable Plans</h3>
              <p className="mt-3 text-slate-400">
                Flexible pricing for creators of all sizes. Start free, upgrade anytime.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Commercial License</h3>
              <p className="mt-3 text-slate-400">
                Use your voiceovers for any commercial purpose. No restrictions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Perfect For Every Creator
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              See how creators use AI TextSpeak
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gradient-to-br from-red-500/20 to-transparent p-6 border border-red-500/20">
              <h3 className="text-lg font-semibold text-white">YouTube Videos</h3>
              <p className="mt-2 text-sm text-slate-400">Create engaging voiceovers for your content</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-purple-500/20 to-transparent p-6 border border-purple-500/20">
              <h3 className="text-lg font-semibold text-white">Audiobooks</h3>
              <p className="mt-2 text-sm text-slate-400">Narrate entire books with natural voices</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-500/20 to-transparent p-6 border border-blue-500/20">
              <h3 className="text-lg font-semibold text-white">Podcasts</h3>
              <p className="mt-2 text-sm text-slate-400">Generate intros, outros, and segments</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-transparent p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-white">E-Learning</h3>
              <p className="mt-2 text-sm text-slate-400">Create educational content at scale</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-t from-amber-500/10 to-transparent">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to Create Amazing Voiceovers?
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            Join thousands of creators using AI TextSpeak to bring their content to life.
          </p>
          <div className="mt-10">
            <Link
              href="https://app.aitextspeak.com/auth/signup"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-10 py-4 text-lg font-semibold text-white shadow-xl shadow-orange-500/30 hover:from-amber-400 hover:to-orange-500 transition-all hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

