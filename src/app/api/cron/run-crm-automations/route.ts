import { NextRequest, NextResponse } from 'next/server';
import { runAutomations } from '@/lib/crm/automations';

// Allow up to 5 minutes for CRM automation run
export const maxDuration = 300;

/**
 * Cron job to run CRM email automations daily
 * 
 * This should be configured in vercel.json to run once per day:
 * {
 *   "crons": [{
 *     "path": "/api/cron/run-crm-automations",
 *     "schedule": "0 12 * * *"  // Run at noon UTC (7 AM EST)
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron job request (Vercel sets this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, verify the cron secret
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('🚀 [CRM Cron] Starting daily email automations...');
  const startTime = Date.now();

  try {
    const result = await runAutomations(false); // Run for real, not dry run

    const duration = Date.now() - startTime;
    
    console.log('✅ [CRM Cron] Completed!', {
      duration: `${duration}ms`,
      processed: result.processed,
      emailsSent: result.emailsSent,
      errors: result.errors,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      results: {
        processed: result.processed,
        emailsSent: result.emailsSent,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('❌ [CRM Cron] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

