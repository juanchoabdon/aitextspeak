import { createAdminClient, createClient } from '@/lib/supabase/server';

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image: string | null;
  tags: string[] | null;
  author_id: string | null;
  author_name: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BlogPostInsert = Omit<BlogPost, 'id' | 'created_at' | 'updated_at'>;
export type BlogPostUpdate = Partial<BlogPostInsert>;

/**
 * Get all published blog posts (for public pages)
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching published posts:', error);
    return [];
  }
  
  return data as BlogPost[];
}

/**
 * Get a single published post by slug (for public pages)
 */
export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  
  if (error) {
    return null;
  }
  
  return data as BlogPost;
}

/**
 * Get all blog posts (for admin)
 */
export async function getAllPosts(): Promise<BlogPost[]> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }
  
  return data as BlogPost[];
}

/**
 * Get a single post by ID (for admin)
 */
export async function getPostById(id: string): Promise<BlogPost | null> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    return null;
  }
  
  return data as BlogPost;
}

/**
 * Create a new blog post
 */
export async function createPost(post: BlogPostInsert): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('blog_posts')
    .insert(post)
    .select('id')
    .single();
  
  if (error) {
    console.error('Error creating post:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true, id: data.id };
}

/**
 * Update a blog post
 */
export async function updatePost(id: string, updates: BlogPostUpdate): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('blog_posts')
    .update(updates)
    .eq('id', id);
  
  if (error) {
    console.error('Error updating post:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Delete a blog post
 */
export async function deletePost(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('blog_posts')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

/**
 * Generate a slug from a title
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}











