import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { BusinessPerformance } from '@/components/admin/BusinessPerformance';

export const metadata: Metadata = {
  title: 'Business Performance - Admin',
  description: 'Business performance metrics and analytics.',
  robots: {
    index: false,
    follow: false,
  },
};

const adminNavItems = [
  { name: 'Users', href: '/admin', icon: 'users' as const },
  { name: 'Transactions', href: '/admin/transactions', icon: 'money' as const },
  { name: 'Business', href: '/admin/business', icon: 'chart' as const },
  { name: 'Services', href: '/admin/services', icon: 'services' as const },
  { name: 'Resources', href: '/admin/blog', icon: 'blog' as const },
];

export default async function BusinessPerformancePage() {
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
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Business Performance
            </h1>
            <p className="mt-1 text-slate-400">Track revenue, user growth, and conversion metrics</p>
          </div>

          <BusinessPerformance />
        </main>
      </div>
    </div>
  );
}






