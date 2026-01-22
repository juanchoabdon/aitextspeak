import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUsage, canGenerateSpeech } from '@/lib/usage';

/**
 * GET /api/usage
 * Get current user's usage information
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const usage = await getCurrentUsage(user.id);

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json(
      { error: 'Failed to get usage' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/usage/check
 * Check if user can generate speech with given character count
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { characterCount } = await request.json();

    if (typeof characterCount !== 'number' || characterCount < 0) {
      return NextResponse.json(
        { error: 'Invalid character count' },
        { status: 400 }
      );
    }

    const result = await canGenerateSpeech(user.id, characterCount);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json(
      { error: 'Failed to check usage' },
      { status: 500 }
    );
  }
}











