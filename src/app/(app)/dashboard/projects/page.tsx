import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { getUser } from '@/lib/supabase/server';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { PaymentSuccessHandler } from '@/components/dashboard/PaymentSuccessHandler';
import { getUserProjects, getProjectTypeIcon, getProjectTypeLabel } from '@/lib/projects/db';

export const metadata: Metadata = {
  title: 'Text to Speech Projects - AI TextSpeak',
  description: 'View and manage your text-to-speech projects.',
  robots: {
    index: false,
    follow: false,
  },
};

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as const },
  { name: 'Text to Speech', href: '/dashboard/projects/new', icon: 'microphone' as const },
  { name: 'My Projects', href: '/dashboard/projects', icon: 'audio' as const },
  { name: 'Billing', href: '/dashboard/billing', icon: 'billing' as const },
  { name: 'Support', href: '/dashboard/support', icon: 'support' as const },
];

export default async function ProjectsPage() {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const projects = await getUserProjects(user.id);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Handle payment success redirects */}
      <Suspense fallback={null}>
        <PaymentSuccessHandler userId={user.id} />
      </Suspense>

      <DashboardHeader email={user.email!} />
      
      <div className="flex">
        <Sidebar items={userNavItems} />
        
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white">Text to Speech Projects</h1>
              <p className="mt-1 text-slate-400">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Text to Speech
            </Link>
          </div>

          {/* Projects List */}
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-slate-400 mb-6">Create your first project to get started with text-to-speech.</p>
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Text to Speech
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-amber-500/50 transition-colors"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                    {getProjectTypeIcon(project.project_type)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{project.title}</h3>
                      {project.is_legacy && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                          Legacy
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span>{getProjectTypeLabel(project.project_type)}</span>
                      <span>•</span>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      {!project.is_legacy && project.audio_count > 0 && (
                        <>
                          <span>•</span>
                          <span>{project.audio_count} audio{project.audio_count !== 1 ? 's' : ''}</span>
                        </>
                      )}
                      {project.total_characters > 0 && (
                        <>
                          <span>•</span>
                          <span>{project.total_characters.toLocaleString()} chars</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
