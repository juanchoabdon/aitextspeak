'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateSpeech } from './index';
import { TTSProvider, GenerateProjectInput } from './types';

export interface GenerateResult {
  success: boolean;
  projectId?: string;
  audioUrl?: string;
  error?: string;
}

export interface PreviewResult {
  success: boolean;
  previewId?: string;
  audioUrl?: string;
  error?: string;
}

export interface PreviewInput {
  text: string;
  voice_id: string;
  voice_name: string;
  provider: TTSProvider;
  language_code: string;
  session_key: string;
}

// Generate a preview (first 200 characters)
export async function generatePreview(input: PreviewInput): Promise<PreviewResult> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  if (!input.text.trim()) {
    return { success: false, error: 'Text is required' };
  }

  if (!input.voice_id) {
    return { success: false, error: 'Voice is required' };
  }

  // Use first 200 characters for preview (or full text if shorter)
  const previewText = input.text.slice(0, 200);

  // Generate speech for preview
  const ttsResult = await generateSpeech({
    text: previewText,
    voice_id: input.voice_id,
    provider: input.provider,
    language_code: input.language_code,
  });

  if (!ttsResult.success || !ttsResult.audio_buffer) {
    return { success: false, error: ttsResult.error || 'Failed to generate preview' };
  }

  // Upload preview audio
  const fileName = `previews/${user.id}/${Date.now()}-preview.mp3`;
  
  const adminClient = createAdminClient();
  const { error: uploadError } = await adminClient.storage
    .from('project-audio')
    .upload(fileName, ttsResult.audio_buffer, {
      contentType: 'audio/mpeg',
      cacheControl: '3600',
    });

  if (uploadError) {
    console.error('Preview upload error:', uploadError);
    return { success: false, error: 'Failed to save preview' };
  }

  const { data: urlData } = adminClient.storage
    .from('project-audio')
    .getPublicUrl(fileName);

  const audioUrl = urlData.publicUrl;

  // Delete any existing preview for this session
  await supabase
    .from('previews')
    .delete()
    .eq('session_key', input.session_key)
    .eq('user_id', user.id);

  // Save preview to database
  const { data: preview, error: previewError } = await supabase
    .from('previews')
    .insert({
      user_id: user.id,
      text_preview: previewText,
      audio_url: audioUrl,
      voice_id: input.voice_id,
      voice_name: input.voice_name,
      language_code: input.language_code,
      provider: input.provider,
      session_key: input.session_key,
    })
    .select('id')
    .single();

  if (previewError) {
    console.error('Preview save error:', previewError);
    return { success: false, error: 'Failed to save preview' };
  }

  // Record usage for preview (using preview text length, not full text)
  try {
    const { recordUsage } = await import('@/lib/usage');
    await recordUsage(user.id, previewText.length);
  } catch (usageError) {
    // Don't fail the request if usage tracking fails
    console.error('Failed to record usage:', usageError);
  }

  return {
    success: true,
    previewId: preview.id,
    audioUrl,
  };
}

// Get existing preview for a session
export async function getPreview(sessionKey: string): Promise<PreviewResult & { preview?: {
  text_preview: string;
  voice_id: string;
  voice_name: string | null;
  language_code: string | null;
  provider: string;
} }> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  const { data: preview, error } = await supabase
    .from('previews')
    .select('*')
    .eq('session_key', sessionKey)
    .eq('user_id', user.id)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !preview) {
    return { success: false };
  }

  return {
    success: true,
    previewId: preview.id,
    audioUrl: preview.audio_url,
    preview: {
      text_preview: preview.text_preview,
      voice_id: preview.voice_id,
      voice_name: preview.voice_name,
      language_code: preview.language_code,
      provider: preview.provider,
    },
  };
}

// Delete preview after project creation
export async function deletePreview(sessionKey: string): Promise<void> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Get preview to delete the audio file too
  const { data: preview } = await supabase
    .from('previews')
    .select('audio_url')
    .eq('session_key', sessionKey)
    .eq('user_id', user.id)
    .single();

  if (preview?.audio_url) {
    // Extract file path from URL and delete
    const url = new URL(preview.audio_url);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('project-audio') + 1).join('/');
    
    const adminClient = createAdminClient();
    await adminClient.storage.from('project-audio').remove([filePath]);
  }

  await supabase
    .from('previews')
    .delete()
    .eq('session_key', sessionKey)
    .eq('user_id', user.id);
}

export async function generateProject(input: GenerateProjectInput & { session_key?: string }): Promise<GenerateResult> {
  const supabase = await createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
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
  const fileName = `${user.id}/${Date.now()}-${generateSlug(input.title)}.mp3`;
  
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

  // Create project record
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: input.title || 'Untitled',
      text_content: input.text,
      audio_url: audioUrl,
      engine: input.provider,
      voice_id: input.voice_id,
      voice_name: input.voice_name,
      language_code: input.language_code,
      characters_count: input.text.length,
      is_legacy: false,
    })
    .select('id')
    .single();

  if (projectError) {
    console.error('Project creation error:', projectError);
    return { success: false, error: 'Failed to save project' };
  }

  // Clean up preview if exists
  if (input.session_key) {
    await deletePreview(input.session_key);
  }

  return {
    success: true,
    projectId: project.id,
    audioUrl,
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50) || 'audio';
}
