import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { getAllServices } from '@/lib/services/db';
import { AdminServicesList } from '@/components/admin/AdminServicesList';
import { adminNavItems } from '@/lib/admin/nav';

// Force SSR
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Manage Services - Admin - AI TextSpeak',
  description: 'Manage services landing pages.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminServicesPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const profile = await getUserProfile(user.id);

  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const services = await getAllServices();

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} isAdmin />
      
      <div className="flex">
        <Sidebar items={adminNavItems} isAdmin />
        
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Services</h1>
              <p className="text-slate-400">Manage service landing pages for SEO and marketing</p>
            </div>
            <Link
              href="/admin/services/new"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-amber-400 hover:to-orange-500 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Service
            </Link>
          </div>

          {/* Services List */}
          <AdminServicesList services={services} />
        </main>
      </div>
    </div>
  );
}






