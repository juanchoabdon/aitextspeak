import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminTransactionsClient } from '@/components/admin/AdminTransactionsClient';

export const metadata = {
  title: 'Transactions | Admin Dashboard',
  description: 'View all payment transactions',
};

export default async function AdminTransactionsPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/login');
  }
  
  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Transactions</h1>
          <p className="mt-1 text-slate-400">View all payment transactions from Stripe and PayPal</p>
        </div>
        <a 
          href="/admin" 
          className="px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
        >
          ← Back to Dashboard
        </a>
      </div>

      {/* Transactions Component */}
      <AdminTransactionsClient />
    </div>
  );
}

