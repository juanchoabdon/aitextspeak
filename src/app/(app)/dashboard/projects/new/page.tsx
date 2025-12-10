import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { NewProjectForm } from '@/components/projects/NewProjectForm';

export const metadata: Metadata = {
  title: 'New Project - AI TextSpeak',
  robots: { index: false, follow: false },
};

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as const },
  { name: 'Create Project', href: '/dashboard/projects/new', icon: 'microphone' as const },
  { name: 'My Projects', href: '/dashboard/projects', icon: 'audio' as const },
  { name: 'Billing', href: '/dashboard/billing', icon: 'billing' as const },
  { name: 'Support', href: '/dashboard/support', icon: 'support' as const },
];

export default async function NewProjectPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} />
      
      <div className="flex">
        <Sidebar items={userNavItems} />
        
        <main className="flex-1 p-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-white mb-2">Create New Project</h1>
            <p className="text-slate-400 mb-8">
              Start by giving your project a name and selecting its type.
            </p>

            <NewProjectForm />
          </div>
        </main>
      </div>
    </div>
  );
}



