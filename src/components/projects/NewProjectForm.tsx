'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject, type ProjectType } from '@/lib/projects/actions';
import { trackProjectCreated, trackError } from '@/lib/analytics/events';

const PROJECT_TYPES: { value: ProjectType; label: string; icon: string; description: string }[] = [
  {
    value: 'youtube',
    label: 'YouTube Video',
    icon: '🎬',
    description: 'Voiceover for YouTube content',
  },
  {
    value: 'audiobook',
    label: 'Audiobook',
    icon: '📚',
    description: 'Narration for books and stories',
  },
  {
    value: 'podcast',
    label: 'Podcast',
    icon: '🎙️',
    description: 'Audio content for podcasts',
  },
  {
    value: 'other',
    label: 'Other',
    icon: '📁',
    description: 'Any other type of project',
  },
];

export function NewProjectForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('youtube');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await createProject({
        title,
        project_type: projectType,
      });

      if (result.success && result.projectId) {
        trackProjectCreated(result.projectId, projectType);
        router.push(`/dashboard/projects/${result.projectId}`);
      } else {
        setError(result.error || 'Failed to create project');
        trackError('project_creation', result.error || 'Unknown error');
      }
    } catch {
      setError('An unexpected error occurred');
      trackError('project_creation', 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Project Name *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          placeholder="My Awesome Project"
        />
      </div>

      {/* Project Type */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">
          Project Type *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PROJECT_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setProjectType(type.value)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                projectType === type.value
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
              }`}
            >
              <span className="text-2xl">{type.icon}</span>
              <div>
                <p className={`font-medium ${projectType === type.value ? 'text-amber-400' : 'text-white'}`}>
                  {type.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !title.trim()}
        className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 font-semibold text-white shadow-lg shadow-orange-500/25 hover:from-amber-400 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating...
          </span>
        ) : (
          'Create Project'
        )}
      </button>
    </form>
  );
}



