import { TTSRequest, TTSResult } from './types';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;

export async function generateElevenLabsSpeech(request: TTSRequest): Promise<TTSResult> {
  const { text, voice_id, voice_settings } = request;

  if (!ELEVENLABS_API_KEY) {
    return {
      success: false,
      characters_count: text.length,
      error: 'ElevenLabs API key not configured',
    };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: request.model_id || 'eleven_monolingual_v1',
          voice_settings: voice_settings || {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      console.error('ElevenLabs TTS error:', response.status, error);
      
      // Properly extract error message (detail can be string or object)
      let errorMessage = response.statusText;
      if (error.detail) {
        if (typeof error.detail === 'string') {
          errorMessage = error.detail;
        } else if (error.detail.message) {
          errorMessage = error.detail.message;
        } else if (error.detail.status) {
          errorMessage = error.detail.status;
        } else {
          errorMessage = JSON.stringify(error.detail);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        characters_count: text.length,
        error: `ElevenLabs TTS failed: ${errorMessage}`,
      };
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      success: true,
      audio_buffer: audioBuffer,
      characters_count: text.length,
    };
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return {
      success: false,
      characters_count: text.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Fetch available voices from ElevenLabs
export async function getElevenLabsVoices() {
  if (!ELEVENLABS_API_KEY) {
    return [];
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch ElevenLabs voices');
      return [];
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('Error fetching ElevenLabs voices:', error);
    return [];
  }
}









