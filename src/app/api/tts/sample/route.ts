import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateSpeech } from '@/lib/tts';
import type { TTSProvider } from '@/lib/tts/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { voice_id, provider, language_code, text } = body;

    if (!voice_id || !provider || !text) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if we already have a cached sample for this voice
    const samplePath = `samples/${voice_id}.mp3`;
    const adminClient = createAdminClient();
    
    const { data: existingFile } = await adminClient.storage
      .from('project-audio')
      .list('samples', { search: `${voice_id}.mp3` });

    if (existingFile && existingFile.length > 0) {
      // Return cached sample
      const { data: urlData } = adminClient.storage
        .from('project-audio')
        .getPublicUrl(samplePath);

      return NextResponse.json({
        success: true,
        audioUrl: urlData.publicUrl,
        cached: true,
      });
    }

    // Generate new sample
    const ttsResult = await generateSpeech({
      text: text.slice(0, 100), // Limit sample to 100 chars
      voice_id,
      provider: provider as TTSProvider,
      language_code,
    });

    if (!ttsResult.success || !ttsResult.audio_buffer) {
      return NextResponse.json({
        success: false,
        error: ttsResult.error || 'Failed to generate sample',
      }, { status: 500 });
    }

    // Upload sample to storage
    const { error: uploadError } = await adminClient.storage
      .from('project-audio')
      .upload(samplePath, ttsResult.audio_buffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000', // Cache for 1 year
        upsert: true,
      });

    if (uploadError) {
      console.error('Sample upload error:', uploadError);
      // Still return success with a data URL as fallback
      const base64 = Buffer.from(ttsResult.audio_buffer).toString('base64');
      return NextResponse.json({
        success: true,
        audioUrl: `data:audio/mpeg;base64,${base64}`,
        cached: false,
      });
    }

    const { data: urlData } = adminClient.storage
      .from('project-audio')
      .getPublicUrl(samplePath);

    return NextResponse.json({
      success: true,
      audioUrl: urlData.publicUrl,
      cached: false,
    });
  } catch (error) {
    console.error('Sample generation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}



