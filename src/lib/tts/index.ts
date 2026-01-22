import { createClient } from '@/lib/supabase/server';
import { generateAzureSpeech } from './azure';
import { generateElevenLabsSpeech } from './elevenlabs';
import { TTSRequest, TTSResult, TTSProvider, Voice } from './types';

export * from './types';

export async function generateSpeech(request: TTSRequest): Promise<TTSResult> {
  switch (request.provider) {
    case 'azure':
      return generateAzureSpeech(request);
    case 'elevenlabs':
      return generateElevenLabsSpeech(request);
    default:
      return {
        success: false,
        characters_count: request.text.length,
        error: `Unknown provider: ${request.provider}`,
      };
  }
}

export async function getVoices(options?: {
  provider?: TTSProvider;
  language_code?: string;
}): Promise<Voice[]> {
  const supabase = await createClient();

  let query = supabase
    .from('voices')
    .select('*')
    .eq('enabled', true)
    .order('language_name')
    .order('name');

  if (options?.provider) {
    query = query.eq('provider', options.provider);
  }

  if (options?.language_code) {
    query = query.eq('language_code', options.language_code);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching voices:', error);
    return [];
  }

  return data as Voice[];
}

export async function getLanguages(): Promise<{ code: string; name: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('voices')
    .select('language_code, language_name')
    .eq('enabled', true)
    .order('language_name');

  if (error) {
    console.error('Error fetching languages:', error);
    return [];
  }

  // Deduplicate
  const seen = new Set<string>();
  const languages: { code: string; name: string }[] = [];

  for (const row of data || []) {
    if (!seen.has(row.language_code)) {
      seen.add(row.language_code);
      languages.push({
        code: row.language_code,
        name: row.language_name,
      });
    }
  }

  return languages;
}

export async function getVoiceById(voiceId: string): Promise<Voice | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('voices')
    .select('*')
    .eq('voice_id', voiceId)
    .eq('enabled', true)
    .single();

  if (error) {
    console.error('Error fetching voice:', error);
    return null;
  }

  return data as Voice;
}











