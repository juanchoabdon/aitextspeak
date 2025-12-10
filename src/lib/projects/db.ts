import { createClient } from '@/lib/supabase/server';

export type ProjectType = 'youtube' | 'audiobook' | 'podcast' | 'other';

export interface Project {
  id: string;
  user_id: string;
  legacy_id: number | null;
  title: string;
  project_type: ProjectType | null;
  // Legacy fields (for migrated projects)
  text_content: string | null;
  audio_url: string | null;
  engine: string | null;
  voice_id: string | null;
  voice_name: string | null;
  language_code: string | null;
  characters_count: number | null;
  is_legacy: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectAudio {
  id: string;
  project_id: string;
  title: string | null;
  text_content: string;
  audio_url: string;
  voice_id: string;
  voice_name: string | null;
  language_code: string | null;
  provider: string;
  characters_count: number;
  duration_seconds: number | null;
  sort_order: number;
  created_at: string;
}

export interface ProjectWithAudio extends Project {
  audio_files: ProjectAudio[];
}

export interface ProjectWithStats extends Project {
  audio_count: number;
  total_characters: number;
}

/**
 * Get all projects for a user with audio stats
 */
export async function getUserProjects(userId: string): Promise<ProjectWithStats[]> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projects, error } = await (supabase as any)
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching projects:', error);
    return [];
  }

  if (!projects || projects.length === 0) {
    return [];
  }

  // Get audio stats for all projects
  const projectIds = projects.map((p: Project) => p.id);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: audioStats } = await (supabase as any)
    .from('project_audio')
    .select('project_id, characters_count')
    .in('project_id', projectIds);

  // Calculate stats per project
  const statsMap: Record<string, { count: number; chars: number }> = {};
  for (const audio of audioStats || []) {
    if (!statsMap[audio.project_id]) {
      statsMap[audio.project_id] = { count: 0, chars: 0 };
    }
    statsMap[audio.project_id].count += 1;
    statsMap[audio.project_id].chars += audio.characters_count || 0;
  }

  // Merge stats with projects
  return projects.map((project: Project) => {
    const stats = statsMap[project.id] || { count: 0, chars: 0 };
    return {
      ...project,
      audio_count: stats.count,
      // For legacy projects, use the project's characters_count; for new, use audio sum
      total_characters: project.is_legacy 
        ? (project.characters_count || 0) 
        : stats.chars,
    };
  }) as ProjectWithStats[];
}

/**
 * Get a single project by ID with its audio files
 */
export async function getProjectById(projectId: string, userId: string): Promise<ProjectWithAudio | null> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: project, error } = await (supabase as any)
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  
  if (error || !project) {
    return null;
  }

  // Get audio files for this project
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: audioFiles } = await (supabase as any)
    .from('project_audio')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  
  return {
    ...project,
    audio_files: audioFiles || [],
  } as ProjectWithAudio;
}

/**
 * Get audio files for a project
 */
export async function getProjectAudioFiles(projectId: string): Promise<ProjectAudio[]> {
  const supabase = await createClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('project_audio')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching project audio:', error);
    return [];
  }
  
  return data as ProjectAudio[];
}

/**
 * Get project type label
 */
export function getProjectTypeLabel(type: ProjectType | null): string {
  switch (type) {
    case 'youtube': return 'YouTube Video';
    case 'audiobook': return 'Audiobook';
    case 'podcast': return 'Podcast';
    case 'other': return 'Other';
    default: return 'Project';
  }
}

/**
 * Get project type icon
 */
export function getProjectTypeIcon(type: ProjectType | null): string {
  switch (type) {
    case 'youtube': return '🎬';
    case 'audiobook': return '📚';
    case 'podcast': return '🎙️';
    default: return '📁';
  }
}
