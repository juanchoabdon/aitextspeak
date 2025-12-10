'use server';

import { createPost, updatePost, deletePost, generateSlug, type BlogPostInsert, type BlogPostUpdate } from './db';
import { revalidatePath } from 'next/cache';

export interface BlogFormData {
  title: string;
  slug: string;
  description: string;
  content: string;
  tags: string;
  status: 'draft' | 'published';
  author_name: string;
  featured_image: string | null;
}

export async function createBlogPost(formData: BlogFormData, authorId: string) {
  const slug = formData.slug || generateSlug(formData.title);
  
  const post: BlogPostInsert = {
    title: formData.title,
    slug,
    description: formData.description,
    content: formData.content,
    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
    status: formData.status,
    author_id: authorId,
    author_name: formData.author_name || 'AI TextSpeak Team',
    published_at: formData.status === 'published' ? new Date().toISOString() : null,
    meta_title: null,
    meta_description: null,
    featured_image: formData.featured_image,
  };

  const result = await createPost(post);
  
  if (result.success) {
    revalidatePath('/blog');
    revalidatePath('/admin/blog');
  }
  
  return result;
}

export async function updateBlogPost(id: string, formData: BlogFormData) {
  const updates: BlogPostUpdate = {
    title: formData.title,
    slug: formData.slug || generateSlug(formData.title),
    description: formData.description,
    content: formData.content,
    tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null,
    status: formData.status,
    author_name: formData.author_name,
    featured_image: formData.featured_image,
  };

  // Set published_at if publishing for the first time
  if (formData.status === 'published') {
    updates.published_at = new Date().toISOString();
  }

  const result = await updatePost(id, updates);
  
  if (result.success) {
    revalidatePath('/blog');
    revalidatePath(`/blog/${updates.slug}`);
    revalidatePath('/admin/blog');
  }
  
  return result;
}

export async function deleteBlogPost(id: string) {
  const result = await deletePost(id);
  
  if (result.success) {
    revalidatePath('/blog');
    revalidatePath('/admin/blog');
  }
  
  return result;
}

