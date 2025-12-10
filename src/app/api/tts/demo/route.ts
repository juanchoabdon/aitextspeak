import { NextRequest, NextResponse } from 'next/server';
import { generateAzureSpeech } from '@/lib/tts/azure';

// Simple in-memory rate limiting (resets on server restart)
// For production, consider using Redis/KV storage
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Rate limit config
const RATE_LIMIT = 10; // Max requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms
const MAX_TEXT_LENGTH = 150; // Characters

// Only allow these specific voices for demo (prevent exploring all voices)
const ALLOWED_DEMO_VOICES = [
  'en-US-AndrewMultilingualNeural',
  'en-US-AvaMultilingualNeural', 
  'en-GB-RyanNeural',
];

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetAt) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || now > record.resetAt) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW };
  }

  if (record.count >= RATE_LIMIT) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: record.resetAt - now 
    };
  }

  // Increment count
  record.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT - record.count, 
    resetIn: record.resetAt - now 
  };
}

/**
 * POST /api/tts/demo
 * 
 * Generate a TTS demo for the homepage (no auth required)
 * - Limited to 150 characters
 * - Rate limited: 10 requests per hour per IP
 * - Only 3 specific voices allowed
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIP = getClientIP(request);
    
    // Check rate limit
    const rateLimit = checkRateLimit(clientIP);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded. Please try again later or sign up for free access.',
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetIn / 1000)),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    const { text, voiceId, provider } = await request.json();

    if (!text || !voiceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate voice is in allowed list
    if (!ALLOWED_DEMO_VOICES.includes(voiceId)) {
      return NextResponse.json(
        { error: 'Invalid voice for demo. Sign up for access to all voices.' },
        { status: 400 }
      );
    }

    // Limit text length for demo
    const limitedText = text.slice(0, MAX_TEXT_LENGTH);

    // Only support Azure for demo (more cost effective)
    if (provider !== 'azure') {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Generate speech
    const result = await generateAzureSpeech({
      text: limitedText,
      voice_id: voiceId,
      provider: 'azure',
    });

    if (!result.success || !result.audio_buffer) {
      return NextResponse.json(
        { error: result.error || 'Failed to generate speech' },
        { status: 500 }
      );
    }

    const audioBuffer = result.audio_buffer;

    // Return audio as response with rate limit headers
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (error) {
    console.error('Demo TTS error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
