export type TTSProvider = 'azure' | 'elevenlabs';

export interface Voice {
  id: string;
  provider: TTSProvider;
  voice_id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Neutral';
  language_code: string;
  language_name: string;
  description?: string;
  sample_url?: string;
  enabled: boolean;
}

export interface TTSRequest {
  text: string;
  voice_id: string;
  provider: TTSProvider;
  // Azure specific
  language_code?: string;
  /**
   * Prosody controls (best-effort, provider-dependent).
   * Expected values: 0.5 | 1 | 1.5 | 2
   */
  speed?: number;
  volume?: number;
  // ElevenLabs specific
  model_id?: string;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
  };
}

export interface TTSResult {
  success: boolean;
  audio_buffer?: ArrayBuffer;
  audio_url?: string;
  characters_count: number;
  error?: string;
}

export interface GenerateProjectInput {
  title: string;
  text: string;
  voice_id: string;
  provider: TTSProvider;
  language_code: string;
  voice_name: string;
  speed?: number;
  volume?: number;
}









