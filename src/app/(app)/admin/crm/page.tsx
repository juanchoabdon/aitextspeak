import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AdminCRMClient } from '@/components/admin/AdminCRMClient';
import { adminNavItems } from '@/lib/admin/nav';

export const metadata: Metadata = {
  title: 'CRM & Automations | Admin Dashboard',
  description: 'Email automations and CRM for AI TextSpeak.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminCRMPage() {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }

  const profile = await getUserProfile(user.id);
  
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} isAdmin />
      
      <div className="flex">
        <Sidebar items={adminNavItems} isAdmin />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 lg:ml-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">CRM & Email Automations</h1>
            <p className="mt-2 text-slate-400">Automate emails based on user behavior to drive engagement and conversions.</p>
          </div>

          <AdminCRMClient />
        </main>
      </div>
    </div>
  );
}

