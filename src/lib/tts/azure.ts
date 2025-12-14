import { TTSRequest, TTSResult } from './types';
import { sanitizeSsmlTextAllowingBreaks } from './ssml';

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY!;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westus2';

function normalizeMultiplier(value: unknown): 0.5 | 1 | 1.5 | 2 {
  const n = Number(value);
  if (n === 0.5 || n === 1 || n === 1.5 || n === 2) return n;
  return 1;
}

function azureRateFromMultiplier(mult: 0.5 | 1 | 1.5 | 2): string | null {
  // Azure expects rate as a number in range [-100, 100] (or predefined strings).
  switch (mult) {
    case 0.5:
      return '-50';
    case 1:
      return null; // omit -> default
    case 1.5:
      return '50';
    case 2:
      return '100';
  }
}

function azureVolumeFromMultiplier(mult: 0.5 | 1 | 1.5 | 2): string | null {
  // Azure expects volume as a number in range [-100, 100] (or predefined strings).
  switch (mult) {
    case 0.5:
      return '-50';
    case 1:
      return null; // omit -> default
    case 1.5:
      return '50';
    case 2:
      return '100';
  }
}

export async function generateAzureSpeech(request: TTSRequest): Promise<TTSResult> {
  const { text, voice_id, language_code } = request;
  
  if (!AZURE_SPEECH_KEY) {
    return {
      success: false,
      characters_count: text.length,
      error: 'Azure Speech API key not configured',
    };
  }

  const speed = normalizeMultiplier(request.speed);
  const volume = normalizeMultiplier(request.volume);
  const rateAttr = azureRateFromMultiplier(speed);
  const volumeAttr = azureVolumeFromMultiplier(volume);

  const prosodyAttrs = [
    rateAttr ? `rate='${rateAttr}'` : null,
    volumeAttr ? `volume='${volumeAttr}'` : null,
  ].filter(Boolean).join(' ');

  const ssmlText = sanitizeSsmlTextAllowingBreaks(text);
  const voiceInner = prosodyAttrs ? `<prosody ${prosodyAttrs}>${ssmlText}</prosody>` : ssmlText;

  // Build SSML
  const ssml = `
    <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${language_code || 'en-US'}'>
      <voice name='${voice_id}'>
        ${voiceInner}
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









