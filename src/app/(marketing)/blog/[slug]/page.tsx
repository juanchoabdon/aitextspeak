import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getBlogPost, getBlogPosts } from '@/lib/blog';

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return {
      title: 'Post Not Found - AI TextSpeak',
    };
  }

  return {
    title: `${post.title} - AI TextSpeak`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://aitextspeak.com/blog/${slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
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
            href="https://app.aitextspeak.com/auth/signup"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 font-semibold text-white hover:from-amber-400 hover:to-orange-500 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </article>
  );
}

