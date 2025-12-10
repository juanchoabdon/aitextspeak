'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBlogPost, updateBlogPost, deleteBlogPost, type BlogFormData } from '@/lib/blog/actions';
import type { BlogPost } from '@/lib/blog/db';
import { ImageUpload } from './ImageUpload';

interface BlogPostFormProps {
  post?: BlogPost;
  authorId: string;
}

export function BlogPostForm({ post, authorId }: BlogPostFormProps) {
  const router = useRouter();
  const isEditing = !!post;

  const [formData, setFormData] = useState<BlogFormData>({
    title: post?.title || '',
    slug: post?.slug || '',
    description: post?.description || '',
    content: post?.content || '',
    tags: post?.tags?.join(', ') || '',
    status: (post?.status === 'archived' ? 'draft' : post?.status) || 'draft',
    author_name: post?.author_name || 'AI TextSpeak Team',
    featured_image: post?.featured_image || null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = isEditing
        ? await updateBlogPost(post.id, formData)
        : await createBlogPost(formData, authorId);

      if (result.success) {
        router.push('/admin/blog');
        router.refresh();
      } else {
        setError(result.error || 'Failed to save post');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!post || !confirm('Are you sure you want to delete this post?')) return;
    
    setIsLoading(true);
    const result = await deleteBlogPost(post.id);
    
    if (result.success) {
      router.push('/admin/blog');
      router.refresh();
    } else {
      setError(result.error || 'Failed to delete post');
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              placeholder="Enter post title"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Slug
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              placeholder="auto-generated-from-title"
            />
            <p className="mt-1 text-xs text-slate-500">Leave empty to auto-generate from title</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={3}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              placeholder="Brief description for SEO and previews"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Content * (HTML)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
              rows={15}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none font-mono text-sm"
              placeholder="<h2>Your content here...</h2>"
            />
            <p className="mt-1 text-xs text-slate-500">Use HTML tags for formatting (h2, p, ul, li, etc.)</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Featured Image */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Featured Image
            </label>
            <ImageUpload
              value={formData.featured_image}
              onChange={(url) => setFormData({ ...formData, featured_image: url })}
            />
          </div>

          {/* Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white focus:border-red-500 focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Author */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Author Name
            </label>
            <input
              type="text"
              value={formData.author_name}
              onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              placeholder="AI TextSpeak Team"
            />
          </div>

          {/* Tags */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
              placeholder="YouTube, Tutorial, AI"
            />
            <p className="mt-1 text-xs text-slate-500">Comma-separated tags</p>
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-red-500 py-3 font-semibold text-white hover:bg-red-400 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update Post' : 'Create Post'}
            </button>
            
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="w-full rounded-xl border border-red-500/50 py-3 font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                Delete Post
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
