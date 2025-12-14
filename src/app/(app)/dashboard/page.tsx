import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUser, getUserProfile } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { getUserProjects, getProjectTypeIcon } from '@/lib/projects/db';
import { getCurrentUsage } from '@/lib/usage';

export const metadata: Metadata = {
  title: 'Dashboard - AI TextSpeak',
  description: 'Your AI TextSpeak dashboard.',
  robots: {
    index: false,
    follow: false,
  },
};

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as const },
  { name: 'Create Project', href: '/dashboard/projects/new', icon: 'microphone' as const },
  { name: 'My Projects', href: '/dashboard/projects', icon: 'audio' as const },
  { name: 'Billing', href: '/dashboard/billing', icon: 'billing' as const },
  { name: 'Support', href: '/dashboard/support', icon: 'support' as const },
];

export default async function DashboardPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const profile = await getUserProfile(user.id);
  const projects = await getUserProjects(user.id);
  const recentProjects = projects.slice(0, 5);
  const usage = await getCurrentUsage(user.id);

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} />
      
      <div className="flex">
        <Sidebar items={userNavItems} />
        
        <main className="flex-1 p-8">
          {/* Welcome Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  Welcome{profile?.first_name ? `, ${profile.first_name}` : ''}! 👋
                </h1>
                <p className="mt-2 text-slate-400">
                  Ready to create amazing voiceovers?
                </p>
              </div>
              {profile?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  Admin Panel
                </Link>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {/* Create Project Card */}
            <Link href="/dashboard/projects/new" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">New Project</h3>
              <p className="mt-2 text-sm text-slate-400">
                Create a new text-to-speech project
              </p>
            </Link>

            {/* My Projects Card */}
            <Link href="/dashboard/projects" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">My Projects</h3>
              <p className="mt-2 text-sm text-slate-400">
                {projects.length} project{projects.length !== 1 ? 's' : ''} created
              </p>
            </Link>

            {/* Account Settings Card */}
            <Link href="/dashboard/settings" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-amber-500/50 transition-colors">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-600">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">Settings</h3>
              <p className="mt-2 text-sm text-slate-400">
                Manage your account and preferences
              </p>
            </Link>
          </div>

          {/* Affiliate Program */}
          <Link
            href="/affiliates"
            className="block rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-600/10 p-6 hover:border-amber-500/60 transition-colors mb-8"
          >
            <div className="flex items-center justify-between gap-6">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white">Affiliate Program</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Earn commission by sharing AI TextSpeak with your audience.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white whitespace-nowrap">
                Learn More →
              </div>
            </div>
          </Link>

          {/* Recent Projects */}
          {recentProjects.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Recent Projects</h2>
                <Link 
                  href="/dashboard/projects"
                  className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                >
                  View all →
                </Link>
              </div>
              <div className="space-y-3">
                {recentProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition-colors"
                  >
                    <span className="text-xl">{getProjectTypeIcon(project.project_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">{project.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(project.created_at).toLocaleDateString()}
                        {project.is_legacy && ' • Legacy'}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Usage Stats */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
            <h2 className="text-xl font-semibold text-white">Your Stats</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-slate-400">Total Projects</p>
                <p className="mt-1 text-3xl font-bold text-white">{projects.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Characters Used This Month</p>
                <p className="mt-1 text-3xl font-bold text-white">{usage.charactersUsed.toLocaleString()}</p>
                {!usage.isUnlimited && (
                  <p className="text-sm text-slate-500">
                    of {usage.charactersLimit.toLocaleString()} ({Math.round(usage.percentUsed)}%)
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-slate-400">Plan</p>
                <p className="mt-1 text-3xl font-bold text-white">{usage.planName}</p>
                {usage.currentPlan === 'free' && (
                  <Link
                    href="/pricing"
                    className="mt-2 inline-block text-sm text-amber-500 hover:text-amber-400"
                  >
                    Upgrade →
                  </Link>
                )}
              </div>
            </div>

            {/* Usage Bar */}
            {!usage.isUnlimited && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Monthly Usage</span>
                  <span className="text-white">
                    {usage.charactersRemaining.toLocaleString()} characters remaining
                  </span>
                </div>
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      usage.percentUsed >= 90 
                        ? 'bg-red-500' 
                        : usage.percentUsed >= 70 
                        ? 'bg-amber-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
