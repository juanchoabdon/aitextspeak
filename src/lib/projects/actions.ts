'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateSpeech } from '@/lib/tts';
import type { TTSProvider } from '@/lib/tts/types';

export type ProjectType = 'youtube' | 'audiobook' | 'podcast' | 'other';

export interface CreateProjectInput {
  title: string;
  project_type: ProjectType;
}

export interface CreateProjectResult {
  success: boolean;
  projectId?: string;
  error?: string;
}

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!input.title.trim()) {
    return { success: false, error: 'Project title is required' };
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      project_type: input.project_type,
      is_legacy: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Create project error:', error);
    return { success: false, error: 'Failed to create project' };
  }

  revalidatePath('/dashboard/projects');

  return {
    success: true,
    projectId: project.id,
  };
}

export interface CreateAudioInput {
  project_id: string;
  title?: string;
  text: string;
  voice_id: string;
  voice_name: string;
  provider: TTSProvider;
  language_code: string;
}

export interface CreateAudioResult {
  success: boolean;
  audioId?: string;
  audioUrl?: string;
  error?: string;
}

export async function createProjectAudio(input: CreateAudioInput): Promise<CreateAudioResult> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify user owns this project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', input.project_id)
    .single();

  if (projectError || !project || project.user_id !== user.id) {
    return { success: false, error: 'Project not found' };
  }

  if (!input.text.trim()) {
    return { success: false, error: 'Text is required' };
  }

  if (!input.voice_id) {
    return { success: false, error: 'Voice is required' };
  }

  if (input.text.length > 5000) {
    return { success: false, error: 'Text exceeds maximum length of 5000 characters' };
  }

  // Generate speech
  const ttsResult = await generateSpeech({
    text: input.text,
    voice_id: input.voice_id,
    provider: input.provider,
    language_code: input.language_code,
  });

  if (!ttsResult.success || !ttsResult.audio_buffer) {
    return { success: false, error: ttsResult.error || 'Failed to generate speech' };
  }

  // Upload audio to Supabase Storage
  const fileName = `${user.id}/${input.project_id}/${Date.now()}.mp3`;
  
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from('project-audio')
    .upload(fileName, ttsResult.audio_buffer, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return { success: false, error: 'Failed to save audio file' };
  }

  const { data: urlData } = adminClient.storage
    .from('project-audio')
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // Get current count for sort order
  const { count } = await supabase
    .from('project_audio')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', input.project_id);

  // Create audio record
  const { data: audio, error: audioError } = await supabase
    .from('project_audio')
    .insert({
      project_id: input.project_id,
      title: input.title || null,
      text_content: input.text,
      audio_url: audioUrl,
      voice_id: input.voice_id,
      voice_name: input.voice_name,
      language_code: input.language_code,
      provider: input.provider,
      characters_count: input.text.length,
      sort_order: (count || 0) + 1,
    })
    .select('id')
    .single();

  if (audioError) {
    console.error('Audio creation error:', audioError);
    return { success: false, error: 'Failed to save audio' };
  }

  // Record usage
  try {
    const { recordUsage } = await import('@/lib/usage');
    await recordUsage(user.id, input.text.length);
  } catch (usageError) {
    // Don't fail the request if usage tracking fails
    console.error('Failed to record usage:', usageError);
  }

  revalidatePath(`/dashboard/projects/${input.project_id}`);

  return {
    success: true,
    audioId: audio.id,
    audioUrl,
  };
}

export async function deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (!project || project.user_id !== user.id) {
    return { success: false, error: 'Project not found' };
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    return { success: false, error: 'Failed to delete project' };
  }

  revalidatePath('/dashboard/projects');

  return { success: true };
}

export async function deleteProjectAudio(audioId: string, projectId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Verify ownership through project
  const { data: project } = await supabase
    .from('projects')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (!project || project.user_id !== user.id) {
    return { success: false, error: 'Not authorized' };
  }

  const { error } = await supabase
    .from('project_audio')
    .delete()
    .eq('id', audioId);

  if (error) {
    return { success: false, error: 'Failed to delete audio' };
  }

  revalidatePath(`/dashboard/projects/${projectId}`);

  return { success: true };
}

