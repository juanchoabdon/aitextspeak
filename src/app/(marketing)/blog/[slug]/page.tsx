import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getBlogPost } from '@/lib/blog';
import { ArticleJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://aitextspeak.com';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Dynamic page - fetches from database on each request
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found - AI TextSpeak',
    };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: {
      canonical: `${SITE_URL}/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${SITE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      images: post.image ? [{ url: post.image, width: 1200, height: 630 }] : [{ url: `${SITE_URL}/og-image.png` }],
      authors: [post.author || 'AI TextSpeak'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : [`${SITE_URL}/og-image.png`],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <ArticleJsonLd
        title={post.title}
        description={post.description}
        url={`${SITE_URL}/blog/${slug}`}
        imageUrl={post.image || `${SITE_URL}/og-image.png`}
        datePublished={post.publishedAt}
        dateModified={post.updatedAt || post.publishedAt}
        authorName={post.author || 'AI TextSpeak'}
      />
      <BreadcrumbJsonLd items={[
        { name: 'Home', url: SITE_URL },
        { name: 'Blog', url: `${SITE_URL}/blog` },
        { name: post.title, url: `${SITE_URL}/blog/${slug}` },
      ]} />
      
    <article className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>

        {/* Header */}
        <header>
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-4xl font-bold text-white sm:text-5xl">
            {post.title}
          </h1>

          <p className="mt-4 text-xl text-slate-400">
            {post.description}
          </p>

          <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
            {post.author && (
              <>
                <span>By {post.author}</span>
                <span>•</span>
              </>
            )}
            <time>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          {/* Featured Image */}
          {post.image && (
            <div className="mt-8 relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-800">
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}
        </header>

        {/* Content */}
        <div 
          className="mt-12 prose prose-invert prose-lg max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-p:text-slate-300
            prose-a:text-amber-500 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white
            prose-code:text-amber-400 prose-code:bg-slate-800 prose-code:px-1 prose-code:rounded
            prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800
            prose-blockquote:border-amber-500 prose-blockquote:text-slate-400
            prose-li:text-slate-300"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* CTA */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-gradient-to-br from-amber-500/10 to-transparent p-8 text-center">
          <h3 className="text-2xl font-bold text-white">
            Ready to Try AI TextSpeak?
          </h3>
          <p className="mt-2 text-slate-400">
            Create professional voiceovers in seconds with our AI technology.
          </p>
          <Link
            href="/auth/signup"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 font-semibold text-white hover:from-amber-400 hover:to-orange-500 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </article>
    </>
  );
}
