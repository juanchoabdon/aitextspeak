import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getBlogPosts } from '@/lib/blog';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

export const metadata: Metadata = {
  title: 'Blog & Resources | AI Text to Speech Tips & Tutorials',
  description: 'Learn about AI text-to-speech technology, voice generation tips, content creation best practices, and tutorials for creating professional voiceovers.',
  keywords: [
    'text to speech tips',
    'AI voice tutorials',
    'voiceover guide',
    'TTS best practices',
    'voice generation blog',
  ],
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: 'Blog & Resources - AI TextSpeak',
    description: 'Tips, tutorials, and insights about AI text-to-speech technology.',
    url: `${SITE_URL}/blog`,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog & Resources - AI TextSpeak',
    description: 'Learn about AI text-to-speech technology and voice generation.',
  },
};

// Dynamic page - fetches from database on each request
export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            Resources
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Tips, tutorials, and insights about AI text-to-speech technology 
            and how to create amazing voiceovers.
          </p>
        </div>

        {/* Blog Posts Grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-amber-500/50 transition-colors"
            >
              <div className="aspect-video bg-slate-800 overflow-hidden relative">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                    <span className="text-4xl">🎙️</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                  <Link href={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-slate-400 line-clamp-3">
                  {post.description}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <time className="text-sm text-slate-500">
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
                  >
                    Read more →
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400">No blog posts yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
