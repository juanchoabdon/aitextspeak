import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceBySlug } from '@/lib/services/db';
import { HeroTTSDemo } from '@/components/home/HeroTTSDemo';
import { TrustStats } from '@/components/home/TrustStats';
import { ServiceJsonLd, BreadcrumbJsonLd, FAQJsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

// Force SSR - no static generation
export const dynamic = 'force-dynamic';

// Service-specific demo texts
const SERVICE_DEMO_TEXTS: Record<string, string> = {
  'youtube-videos': "Hey everyone, welcome back to the channel! Today we're diving into something exciting.",
  'podcasts': "Welcome to another episode! I'm your host, and today we have an amazing topic to discuss.",
  'audiobooks': "Chapter One. It was a dark and stormy night when the adventure began.",
  'e-learning': "In this lesson, we'll explore the key concepts and practical applications.",
  'commercials': "Introducing the future of innovation. Experience excellence like never before.",
  'ivr-phone-systems': "Thank you for calling. Press 1 for sales, press 2 for support.",
};

// Service-specific FAQs
const SERVICE_FAQS: Record<string, { question: string; answer: string }[]> = {
  'youtube-videos': [
    { question: 'Can I use AI voices for YouTube videos?', answer: 'Yes! Our AI voices are perfect for YouTube content. Many creators use our voices for tutorials, explainer videos, documentaries, and more.' },
    { question: 'Will YouTube monetization work with AI voices?', answer: 'Yes, YouTube allows monetization of videos with AI-generated voices as long as the content follows their guidelines.' },
  ],
  'podcasts': [
    { question: 'Can I create a full podcast with AI voices?', answer: 'Absolutely! Our AI voices are designed for long-form content. Create consistent, professional podcast narration with our natural-sounding voices.' },
    { question: 'How do I make AI podcast voices sound natural?', answer: 'Our neural voices use advanced AI to create natural speech patterns. You can also adjust pacing and add pauses for a more conversational feel.' },
  ],
  'audiobooks': [
    { question: 'Are AI voices good enough for audiobooks?', answer: 'Yes! Our premium neural voices provide natural, engaging narration perfect for audiobooks. Choose from different voice styles to match your book genre.' },
    { question: 'How long does it take to create an audiobook?', answer: 'With AI TextSpeak, you can convert your entire book to audio in minutes, not weeks. Simply paste your text and select a voice.' },
  ],
};

interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  
  if (!service) {
    return {
      title: 'Service Not Found - AI TextSpeak',
    };
  }

  return {
    title: service.meta_title || `${service.name} - AI Text to Speech | AI TextSpeak`,
    description: service.meta_description || service.short_description,
    alternates: {
      canonical: `${SITE_URL}/services/${service.slug}`,
    },
    openGraph: {
      title: service.meta_title || `${service.name} - AI TextSpeak`,
      description: service.meta_description || service.short_description,
      url: `${SITE_URL}/services/${service.slug}`,
      type: 'website',
      images: service.hero_image_url 
        ? [{ url: service.hero_image_url, width: 1200, height: 630 }]
        : [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: service.meta_title || service.name,
      description: service.meta_description || service.short_description,
      images: service.hero_image_url ? [service.hero_image_url] : [`${SITE_URL}/og-image.png`],
    },
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  const faqs = SERVICE_FAQS[slug] || [];

  return (
    <>
      <ServiceJsonLd
        name={service.name}
        description={service.short_description}
        url={`${SITE_URL}/services/${service.slug}`}
      />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Services', url: `${SITE_URL}/services` },
        { name: service.name, url: `${SITE_URL}/services/${service.slug}` },
      ]} />
      {faqs.length > 0 && <FAQJsonLd questions={faqs} />}
      
    <div>
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Icon */}
            <div className="text-7xl mb-6">{service.icon || '🎯'}</div>
            
            {/* Title */}
            <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
              {service.hero_title}
            </h1>
            
            {/* Subtitle */}
            {service.hero_subtitle && (
              <p className="mt-6 text-xl text-slate-300">
                {service.hero_subtitle}
              </p>
            )}

            {/* Try It Now - Demo */}
            <HeroTTSDemo defaultText={SERVICE_DEMO_TEXTS[service.slug]} />
          </div>
        </div>
      </section>

      {/* Trust Stats Section */}
      <TrustStats />

      {/* Features Section */}
      {service.features && service.features.length > 0 && (
        <section className="py-24 border-t border-slate-800/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Why Choose Us for {service.name}
              </h2>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {service.features.map((feature, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center"
                >
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      {service.how_it_works && service.how_it_works.length > 0 && (
        <section className="py-24 bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                How It Works
              </h2>
              <p className="mt-4 text-slate-400">
                Create professional {service.name.toLowerCase()} voiceovers in 3 simple steps
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {service.how_it_works.map((step, index) => (
                <div key={index} className="relative">
                  {/* Connector Line */}
                  {index < service.how_it_works.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-amber-500 to-transparent" />
                  )}
                  
                  <div className="relative rounded-2xl border border-slate-800 bg-slate-900 p-8">
                    {/* Step Number */}
                    <div className="absolute -top-4 left-8 w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                      {step.step}
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mt-2 mb-3">{step.title}</h3>
                    <p className="text-slate-400">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Use Cases Section */}
      {service.use_cases && service.use_cases.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Perfect For
              </h2>
              <p className="mt-4 text-slate-400">
                See how creators use AI TextSpeak for {service.name.toLowerCase()}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {service.use_cases.map((useCase, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors"
                >
                  <h3 className="font-bold text-white mb-2">{useCase.title}</h3>
                  <p className="text-slate-400 text-sm">{useCase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {service.testimonials && service.testimonials.length > 0 && (
        <section className="py-24 bg-slate-900/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                What Creators Say
              </h2>
              <p className="mt-4 text-slate-400">
                Join thousands of satisfied users
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {service.testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-8"
                >
                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-slate-300 mb-6">&quot;{testimonial.content}&quot;</p>

                  {/* Author */}
                  <div>
                    <div className="font-bold text-white">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Long Description Section */}
      {service.long_description && (
        <section className="py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <div className="prose prose-invert prose-lg max-w-none">
              <p className="text-slate-300 leading-relaxed">
                {service.long_description}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Final CTA Section */}
      <section className="py-24 bg-gradient-to-b from-slate-900/50 to-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {service.cta_title}
          </h2>
          <p className="mt-4 text-xl text-slate-400">
            {service.cta_subtitle}
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={service.cta_button_link}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all cursor-pointer"
            >
              {service.cta_button_text}
              <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Free to try</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>100+ AI voices</span>
            </div>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
