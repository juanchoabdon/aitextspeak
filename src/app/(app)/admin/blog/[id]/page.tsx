import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BlogPostForm } from '@/components/admin/BlogPostForm';
import { getPostById } from '@/lib/blog/db';

export const metadata: Metadata = {
  title: 'Edit Blog Post - Admin',
  robots: { index: false, follow: false },
};

const adminNavItems = [
  { name: 'Users', href: '/admin', icon: 'users' as const },
  { name: 'Transactions', href: '/admin/transactions', icon: 'money' as const },
  { name: 'Business', href: '/admin/business', icon: 'chart' as const },
  { name: 'Services', href: '/admin/services', icon: 'services' as const },
  { name: 'Resources', href: '/admin/blog', icon: 'blog' as const },
];

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params;
  
  const user = await getUser();
  if (!user) redirect('/auth/signin');

  const profile = await getUserProfile(user.id);
  if (profile?.role !== 'admin') redirect('/dashboard');

  const post = await getPostById(id);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} isAdmin />
      
      <div className="flex">
        <Sidebar items={adminNavItems} isAdmin />
        
        <main className="flex-1 p-8">
          <div className="mb-8">
            <Link
              href="/admin/blog"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Blog
            </Link>
            <h1 className="mt-4 text-2xl font-bold text-white">Edit Post</h1>
          </div>

          <BlogPostForm post={post} authorId={user.id} />
        </main>
      </div>
    </div>
  );
}

