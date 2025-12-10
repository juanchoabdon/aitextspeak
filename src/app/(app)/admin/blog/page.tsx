import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { getAllPosts } from '@/lib/blog/db';

export const metadata: Metadata = {
  title: 'Resources Management - Admin',
  robots: { index: false, follow: false },
};

const adminNavItems = [
  { name: 'Users', href: '/admin', icon: 'users' as const },
  { name: 'Resources', href: '/admin/blog', icon: 'blog' as const },
];

export default async function AdminBlogPage() {
  const user = await getUser();
  if (!user) redirect('/auth/signin');

  const profile = await getUserProfile(user.id);
  if (profile?.role !== 'admin') redirect('/dashboard');

  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} isAdmin />
      
      <div className="flex">
        <Sidebar items={adminNavItems} isAdmin />
        
        <main className="flex-1 p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Resources</h1>
            <Link
              href="/admin/blog/new"
              className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Post
            </Link>
          </div>

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-slate-400">No blog posts yet.</p>
              <Link
                href="/admin/blog/new"
                className="mt-4 inline-block text-red-400 hover:text-red-300"
              >
                Create your first post →
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/50">
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Title</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-800/30">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-white">{post.title}</p>
                          <p className="text-sm text-slate-500">/{post.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          post.status === 'published'
                            ? 'bg-green-500/20 text-green-400'
                            : post.status === 'draft'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {post.published_at 
                          ? new Date(post.published_at).toLocaleDateString()
                          : new Date(post.created_at).toLocaleDateString()
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="text-sm text-red-400 hover:text-red-300"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

