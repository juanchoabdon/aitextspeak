import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AdminUsersList } from '@/components/admin/AdminUsersList';

export const metadata: Metadata = {
  title: 'Admin Dashboard - AI TextSpeak',
  description: 'Admin dashboard for AI TextSpeak.',
  robots: {
    index: false,
    follow: false,
  },
};

const adminNavItems = [
  { name: 'Users', href: '/admin', icon: 'users' as const },
  { name: 'Services', href: '/admin/services', icon: 'services' as const },
  { name: 'Resources', href: '/admin/blog', icon: 'blog' as const },
];

export default async function AdminDashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const profile = await getUserProfile(user.id);

  // Check if user is admin
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} isAdmin />
      
      <div className="flex">
        <Sidebar items={adminNavItems} isAdmin />
        
        <main className="flex-1 p-8">
          {/* Stats Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-white">--</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Active Subscriptions</p>
              <p className="mt-2 text-3xl font-bold text-white">--</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Legacy Users</p>
              <p className="mt-2 text-3xl font-bold text-white">--</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-sm text-slate-400">Migrated Users</p>
              <p className="mt-2 text-3xl font-bold text-white">--</p>
            </div>
          </div>

          {/* Users List */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Users</h2>
            <AdminUsersList />
          </div>
        </main>
      </div>
    </div>
  );
}
