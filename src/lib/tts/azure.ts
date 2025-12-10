import { TTSRequest, TTSResult } from './types';

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westus2';

export async function generateAzureSpeech(request: TTSRequest): Promise<TTSResult> {
  const { text, voice_id, language_code } = request;
  
  if (!AZURE_SPEECH_KEY) {
    return {
      success: false,
      characters_count: text.length,
      error: 'Azure Speech API key not configured',
    };
  }

  // Build SSML
  const ssml = `
    <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language_code || 'en-US'}'>
      <voice name='${voice_id}'>
        ${escapeXml(text)}
      </voice>
    </speak>
  `.trim();

  try {
    const response = await fetch(
      `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          'User-Agent': 'AITextSpeak',
        },
        body: ssml,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Azure TTS error:', response.status, errorText);
      return {
        success: false,
        characters_count: text.length,
        error: `Azure TTS failed: ${response.status} ${errorText}`,
      };
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      success: true,
      audio_buffer: audioBuffer,
      characters_count: text.length,
    };
  } catch (error) {
    console.error('Azure TTS error:', error);
    return {
      success: false,
      characters_count: text.length,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}



