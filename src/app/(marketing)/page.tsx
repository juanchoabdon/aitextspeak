import type { Metadata } from 'next';
import Link from 'next/link';
import { HeroTTSDemo } from '@/components/home/HeroTTSDemo';
import { TrustStats } from '@/components/home/TrustStats';
import { OrganizationJsonLd, WebsiteJsonLd, SoftwareApplicationJsonLd, FAQJsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

export const metadata: Metadata = {
  title: 'AI TextSpeak - #1 AI Text to Speech Generator | Free Online TTS',
  description: 'Transform your text into natural, human-like speech with AI TextSpeak. Create professional voiceovers for YouTube, audiobooks, podcasts & more. 500+ AI voices, 50+ languages. Try free!',
  keywords: [
    'AI text to speech',
    'text to speech online',
    'free TTS',
    'voice generator',
    'AI voiceover',
    'YouTube voiceover generator',
    'audiobook narrator AI',
    'podcast voice generator',
    'text to audio converter',
    'natural voice synthesis',
    'realistic AI voices',
    'online voice generator',
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: 'AI TextSpeak - #1 AI Text to Speech Generator | Free Online TTS',
    description: 'Transform your text into natural, human-like speech. 500+ AI voices, 50+ languages. Create professional voiceovers for YouTube, audiobooks & podcasts.',
    url: SITE_URL,
    siteName: 'AI TextSpeak',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'AI TextSpeak - Professional AI Text to Speech',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI TextSpeak - #1 AI Text to Speech Generator',
    description: 'Transform your text into natural, human-like speech. 500+ AI voices, 50+ languages. Try free!',
    images: [`${SITE_URL}/og-image.png`],
  },
};

const homeFAQs = [
  {
    question: 'What is AI TextSpeak?',
    answer: 'AI TextSpeak is a professional text-to-speech platform that converts text into natural, human-like speech using advanced AI technology. Perfect for creating voiceovers for YouTube videos, audiobooks, podcasts, and more.',
  },
  {
    question: 'Is AI TextSpeak free to use?',
    answer: 'Yes! AI TextSpeak offers a free plan with 5,000 characters per month. You can upgrade to our paid plans for more characters and premium features.',
  },
  {
    question: 'How many voices and languages are available?',
    answer: 'AI TextSpeak offers over 500 AI voices in 50+ languages, including English, Spanish, French, German, Japanese, and many more.',
  },
  {
    question: 'Can I use the generated audio commercially?',
    answer: 'Yes, all audio generated with AI TextSpeak can be used for commercial purposes, including YouTube videos, podcasts, audiobooks, and marketing materials.',
  },
];

export default function HomePage() {
  return (
    <>
      {/* Structured Data */}
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <SoftwareApplicationJsonLd />
      <FAQJsonLd questions={homeFAQs} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-orange-500/20 to-transparent blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="block text-white">Transform Text Into</span>
              <span className="block bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Natural Speech
              </span>
            </h1>
            
            <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
              Create professional voiceovers for YouTube videos, audiobooks, podcasts, 
              and more with our advanced AI text-to-speech technology.
            </p>

            {/* TTS Demo */}
            <HeroTTSDemo />
          </div>
        </div>
      </section>

      {/* Trust Stats Section */}
      <TrustStats />

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

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              What Creators Say
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Join thousands of satisfied creators worldwide
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Testimonial 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">
                &quot;AI TextSpeak has completely transformed my YouTube workflow. I can now produce videos 3x faster without compromising on quality. The voices are incredibly natural!&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-red-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  MR
                </div>
                <div>
                  <div className="font-semibold text-white">Marcus Rodriguez</div>
                  <div className="text-sm text-slate-500">YouTube Creator • 850K subscribers</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">
                &quot;As an indie author, I couldn&apos;t afford professional narrators. AI TextSpeak let me turn my entire book series into audiobooks. My readers love them!&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                  ST
                </div>
                <div>
                  <div className="font-semibold text-white">Sarah Thompson</div>
                  <div className="text-sm text-slate-500">Author • 12 audiobooks published</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">
                &quot;We use AI TextSpeak for all our e-learning courses. The multi-language support is amazing - we&apos;ve localized our content into 15 languages effortlessly.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  DK
                </div>
                <div>
                  <div className="font-semibold text-white">David Kim</div>
                  <div className="text-sm text-slate-500">CEO • EduTech Solutions</div>
                </div>
              </div>
            </div>

            {/* Testimonial 4 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">
                &quot;The voice quality is indistinguishable from human narrators. My podcast intro sounds professional and my audience had no idea it was AI-generated!&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold">
                  JL
                </div>
                <div>
                  <div className="font-semibold text-white">Jessica Lee</div>
                  <div className="text-sm text-slate-500">Podcast Host • Tech Talk Daily</div>
                </div>
              </div>
            </div>

            {/* Testimonial 5 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">
                &quot;Saved our marketing team thousands of dollars. We now create professional video ads with voiceovers in-house. The ROI has been incredible.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
                  AP
                </div>
                <div>
                  <div className="font-semibold text-white">Alex Patel</div>
                  <div className="text-sm text-slate-500">Marketing Director • StartupXYZ</div>
                </div>
              </div>
            </div>

            {/* Testimonial 6 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 hover:border-amber-500/30 transition-colors">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 mb-6">
                &quot;I&apos;ve tried every TTS tool out there. AI TextSpeak is hands down the best - natural voices, easy interface, and the pricing is unbeatable.&quot;
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center text-white font-bold">
                  EM
                </div>
                <div>
                  <div className="font-semibold text-white">Emma Martinez</div>
                  <div className="text-sm text-slate-500">Content Creator • 2M+ followers</div>
                </div>
              </div>
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
              href="/auth/signup"
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
