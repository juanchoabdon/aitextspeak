import { NextRequest, NextResponse } from 'next/server';
import { handleStripeWebhook } from '@/lib/payments/stripe';

// Disable body parsing, we need the raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /webhook/stripe
 * 
 * Handles Stripe webhook events for:
 * - checkout.session.completed
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_failed
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Stripe webhook: Missing signature');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const result = await handleStripeWebhook(body, signature);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Webhook handler failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Stripe webhooks don't need CORS or other methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
