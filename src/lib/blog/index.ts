import { getPublishedPosts, getPublishedPostBySlug, type BlogPost } from './db';
import type { BlogPostMeta } from '@/types';

// Re-export types
export type { BlogPost } from './db';

/**
 * Get all published blog posts (metadata only for listing)
 */
export async function getBlogPosts(): Promise<BlogPostMeta[]> {
  const posts = await getPublishedPosts();
  
  return posts.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.published_at || post.created_at,
    tags: post.tags || undefined,
    image: post.featured_image || undefined,
  }));
}

/**
 * Get a single blog post by slug
 */
export async function getBlogPost(slug: string): Promise<{
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  tags?: string[];
  image?: string;
} | null> {
  const post = await getPublishedPostBySlug(slug);
  
  if (!post) {
    return null;
  }
  
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    content: post.content,
    publishedAt: post.published_at || post.created_at,
    updatedAt: post.updated_at,
    author: post.author_name || undefined,
    tags: post.tags || undefined,
    image: post.featured_image || undefined,
  };
}

