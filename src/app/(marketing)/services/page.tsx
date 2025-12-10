import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedServices } from '@/lib/services/db';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

// Force SSR - no static generation
export const dynamic = 'force-dynamic';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

export const metadata: Metadata = {
  title: 'AI Text to Speech Services | YouTube, Podcast, Audiobook Voiceovers',
  description: 'Professional AI voice generation services for YouTube videos, podcasts, audiobooks, e-learning & more. 500+ realistic AI voices, 50+ languages. Create studio-quality voiceovers instantly.',
  keywords: [
    'AI voiceover services',
    'YouTube voice generator',
    'podcast voiceover',
    'audiobook narrator',
    'e-learning voice',
    'text to speech services',
    'professional voiceover',
  ],
  alternates: {
    canonical: `${SITE_URL}/services`,
  },
  openGraph: {
    title: 'AI Voice Services - Professional Voiceovers for Any Content',
    description: 'Create professional voiceovers for YouTube, podcasts, audiobooks & more with AI.',
    url: `${SITE_URL}/services`,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Voice Services - AI TextSpeak',
    description: 'Professional AI voiceovers for YouTube, podcasts, audiobooks & more.',
  },
};

export default async function ServicesPage() {
  const services = await getPublishedServices();

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Services', url: `${SITE_URL}/services` },
      ]} />
      
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            AI Voice Services for{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Every Need
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-400">
            Transform your content with professional AI-generated voiceovers. 
            From YouTube videos to audiobooks, we have you covered.
          </p>
        </div>

        {/* Services Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Link
              key={service.id}
              href={`/services/${service.slug}`}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-8 hover:border-amber-500/50 hover:bg-slate-900 transition-all cursor-pointer"
            >
              {/* Featured Badge */}
              {service.is_featured && (
                <div className="absolute -top-3 right-4">
                  <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1 text-xs font-medium text-white">
                    Popular
                  </span>
                </div>
              )}

              {/* Icon */}
              <div className="text-5xl mb-4">{service.icon || '🎯'}</div>

              {/* Content */}
              <h2 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                {service.name}
              </h2>
              <p className="mt-2 text-slate-400 text-sm line-clamp-2">
                {service.short_description}
              </p>

              {/* Arrow */}
              <div className="mt-6 flex items-center text-amber-500 text-sm font-medium">
                Learn more
                <svg 
                  className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {services.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎙️</div>
            <h2 className="text-xl font-bold text-white mb-2">Services Coming Soon</h2>
            <p className="text-slate-400">We&apos;re preparing amazing AI voice services for you.</p>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="inline-block rounded-2xl border border-slate-700 bg-slate-900/50 p-8 md:p-12">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              Not sure which service is right for you?
            </h2>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              Try our AI voice generator for free and experience the quality yourself. 
              No credit card required.
            </p>
            <Link
              href="/auth/signup"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-3 text-lg font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all cursor-pointer"
            >
              Try It Free
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
