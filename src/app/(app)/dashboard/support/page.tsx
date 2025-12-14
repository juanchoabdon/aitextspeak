import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HelpTicketForm } from '@/components/help/HelpTicketForm';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';

export const metadata: Metadata = {
  title: 'Support - AI TextSpeak',
  description: 'Get help with AI TextSpeak',
};

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as const },
  { name: 'Create Project', href: '/dashboard/projects/new', icon: 'microphone' as const },
  { name: 'My Projects', href: '/dashboard/projects', icon: 'audio' as const },
  { name: 'Billing', href: '/dashboard/billing', icon: 'billing' as const },
  { name: 'Support', href: '/dashboard/support', icon: 'support' as const },
];

export default async function DashboardSupportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  const fullName = profile?.first_name 
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : '';

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} />
      
      <div className="flex">
        <Sidebar items={userNavItems} />
        
        <main className="flex-1 p-8">
          <div className="max-w-4xl space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-white">Support</h1>
              <p className="mt-2 text-slate-400">
                Need help? Submit a ticket and we&apos;ll get back to you within 24 hours.
              </p>
            </div>

            {/* Quick Help */}
            <div className="grid gap-4 sm:grid-cols-3">
              <a
                href="/help"
                target="_blank"
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-amber-500/10 p-3">
                    <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">Help Center</h3>
                    <p className="text-sm text-slate-400">Browse FAQs</p>
                  </div>
                </div>
              </a>

              <a
                href="mailto:info@aitextspeak.com"
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-amber-500 transition-colors">Email Us</h3>
                    <p className="text-sm text-slate-400">info@aitextspeak.com</p>
                  </div>
                </div>
              </a>

              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-green-500/10 p-3">
                    <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Response Time</h3>
                    <p className="text-sm text-slate-400">Within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Form */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white mb-6">Submit a Ticket</h2>
              <HelpTicketForm prefillEmail={user.email} prefillName={fullName} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}






