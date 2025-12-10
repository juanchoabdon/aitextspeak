import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AdminUsersList } from '@/components/admin/AdminUsersList';
import { getAdminStats } from '@/lib/admin/stats';

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

function StatCard({ 
  label, 
  value, 
  subValue,
  color = 'slate' 
}: { 
  label: string; 
  value: number | string; 
  subValue?: string;
  color?: 'slate' | 'amber' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    slate: 'border-slate-800',
    amber: 'border-amber-500/30 bg-amber-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
  };

  return (
    <div className={`rounded-2xl border bg-slate-900/50 p-6 ${colorClasses[color]}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {subValue && <p className="mt-1 text-xs text-slate-500">{subValue}</p>}
    </div>
  );
}

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

  const stats = await getAdminStats();

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} isAdmin />
      
      <div className="flex">
        <Sidebar items={adminNavItems} isAdmin />
        
        <main className="flex-1 p-8">
          {/* Section: Users Overview */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              Users Overview
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                label="Total Users" 
                value={stats.totalUsers}
                color="blue"
              />
              <StatCard 
                label="New Users (Post-Legacy)" 
                value={stats.newUsers}
                subValue="Signed up on new platform"
                color="green"
              />
              <StatCard 
                label="Legacy Users Migrated" 
                value={stats.legacyUsersMigrated}
                subValue={`of ${stats.totalLegacyUsers} total legacy`}
                color="amber"
              />
              <StatCard 
                label="Pending Migration" 
                value={stats.pendingMigration}
                subValue="Legacy users not yet migrated"
                color="slate"
              />
            </div>
          </div>

          {/* Section: Subscriptions */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Active Subscriptions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                label="Total Active" 
                value={stats.activeSubscribersLegacy + stats.activeSubscribersNew}
                color="green"
              />
              <StatCard 
                label="Legacy Subscribers" 
                value={stats.activeSubscribersLegacy}
                subValue="Migrated from old system"
                color="amber"
              />
              <StatCard 
                label="New Subscribers" 
                value={stats.activeSubscribersNew}
                subValue="Signed up on new platform"
                color="purple"
              />
              <StatCard 
                label="Conversion Rate" 
                value={stats.totalUsers > 0 
                  ? `${(((stats.activeSubscribersLegacy + stats.activeSubscribersNew) / stats.totalUsers) * 100).toFixed(1)}%`
                  : '0%'
                }
                subValue="Active subs / Total users"
                color="blue"
              />
            </div>
          </div>

          {/* Section: Content Stats */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Content & Usage
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                label="Total Projects" 
                value={stats.totalProjects}
                color="slate"
              />
              <StatCard 
                label="Audio Files Generated" 
                value={stats.totalAudioGenerated}
                color="slate"
              />
            </div>
          </div>

          {/* Users List */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Recent Users
            </h2>
            <AdminUsersList />
          </div>
        </main>
      </div>
    </div>
  );
}
