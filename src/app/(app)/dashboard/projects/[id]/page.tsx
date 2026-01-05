import type { Metadata } from 'next';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getUser } from '@/lib/supabase/server';
import { getProjectById, getProjectTypeLabel, getProjectTypeIcon } from '@/lib/projects/db';
import { getVoices, getLanguages } from '@/lib/tts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { ProjectAudioList } from '@/components/projects/ProjectAudioList';
import { AddAudioForm } from '@/components/projects/AddAudioForm';

export const metadata: Metadata = {
  title: 'Project - AI TextSpeak',
  robots: { index: false, follow: false },
};

const userNavItems = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' as const },
  { name: 'Text to Speech', href: '/dashboard/projects/new', icon: 'microphone' as const },
  { name: 'My Projects', href: '/dashboard/projects', icon: 'audio' as const },
  { name: 'Billing', href: '/dashboard/billing', icon: 'billing' as const },
  { name: 'Support', href: '/dashboard/support', icon: 'support' as const },
];

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  const project = await getProjectById(id, user.id);

  if (!project) {
    notFound();
  }

  // Fetch voices and languages for the form
  const [voices, languages] = await Promise.all([
    getVoices(),
    getLanguages(),
  ]);

  const isLegacy = project.is_legacy;

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardHeader email={user.email!} />
      
      <div className="flex">
        <Sidebar items={userNavItems} />
        
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Projects
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getProjectTypeIcon(project.project_type)}</span>
                <div>
                  <h1 className="text-2xl font-bold text-white">{project.title}</h1>
                  <p className="text-slate-400">
                    {getProjectTypeLabel(project.project_type)}
                    {isLegacy && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                        Legacy
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Legacy Project - Show single audio */}
          {isLegacy && project.audio_url && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">Audio File</h2>
              <ProjectAudioList 
                audioFiles={[{
                  id: project.id,
                  project_id: project.id,
                  title: project.title,
                  text_content: project.text_content || '',
                  audio_url: project.audio_url,
                  voice_id: project.voice_id || '',
                  voice_name: project.voice_name,
                  language_code: project.language_code,
                  provider: project.engine || 'azure',
                  characters_count: project.characters_count || 0,
                  duration_seconds: null,
                  sort_order: 0,
                  created_at: project.created_at,
                }]}
                projectId={project.id}
                isLegacy={true}
              />
            </div>
          )}

          {/* New Project Flow - Show audio list and add form */}
          {!isLegacy && (
            <>
              {/* Existing Audio Files */}
              {project.audio_files.length > 0 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">
                      Audio Files ({project.audio_files.length})
                    </h2>
                    <a
                      href="#new-audio"
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-amber-400 hover:to-orange-500 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Audio
                    </a>
                  </div>
                  <ProjectAudioList 
                    audioFiles={project.audio_files} 
                    projectId={project.id}
                    isLegacy={false}
                  />
                </div>
              )}

              {/* Add New Audio */}
              <div id="new-audio" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 scroll-mt-24">
                <h2 className="text-lg font-semibold text-white mb-4">
                  {project.audio_files.length === 0 ? 'Create Your First Audio' : 'Add More Audio'}
                </h2>
                <AddAudioForm 
                  projectId={project.id}
                  voices={voices}
                  languages={languages}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

