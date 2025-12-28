import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AdminTransactionsClient } from '@/components/admin/AdminTransactionsClient';
import { adminNavItems } from '@/lib/admin/nav';

export const metadata: Metadata = {
  title: 'Transactions | Admin Dashboard',
  description: 'View all payment transactions',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminTransactionsPage() {
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
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Transactions</h1>
            <p className="mt-1 text-slate-400">View all payment transactions from Stripe and PayPal</p>
          </div>

          {/* Transactions Component */}
          <AdminTransactionsClient />
        </main>
      </div>
    </div>
  );
}

