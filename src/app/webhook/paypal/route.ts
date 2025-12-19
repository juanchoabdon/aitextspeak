import { NextRequest, NextResponse } from 'next/server';
import { handlePayPalWebhook, verifyWebhookSignature } from '@/lib/payments/paypal';

// Disable body parsing, we need the raw body for signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// TEMPORARY: Set to true to skip signature verification for debugging
// REMOVE THIS IN PRODUCTION once webhooks are working
const SKIP_VERIFICATION = process.env.PAYPAL_SKIP_WEBHOOK_VERIFICATION === 'true';

interface PayPalEvent {
  id: string;
  event_type: string;
  resource: Record<string, unknown>;
  create_time: string;
  resource_type: string;
  summary: string;
}

/**
 * POST /webhook/paypal
 * 
 * Handles PayPal webhook events for:
 * - BILLING.SUBSCRIPTION.CREATED
 * - BILLING.SUBSCRIPTION.ACTIVATED
 * - BILLING.SUBSCRIPTION.CANCELLED
 * - BILLING.SUBSCRIPTION.SUSPENDED
 * - BILLING.SUBSCRIPTION.EXPIRED
 * - BILLING.SUBSCRIPTION.RENEWED
 * - PAYMENT.SALE.COMPLETED
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.text();
    
    // PayPal webhook verification headers
    const headers: Record<string, string> = {};
    headers['paypal-auth-algo'] = request.headers.get('paypal-auth-algo') || '';
    headers['paypal-cert-url'] = request.headers.get('paypal-cert-url') || '';
    headers['paypal-transmission-id'] = request.headers.get('paypal-transmission-id') || '';
    headers['paypal-transmission-sig'] = request.headers.get('paypal-transmission-sig') || '';
    headers['paypal-transmission-time'] = request.headers.get('paypal-transmission-time') || '';

    console.log('[PayPal Webhook] Incoming request:', {
      skipVerification: SKIP_VERIFICATION,
      hasTransmissionId: !!headers['paypal-transmission-id'],
      hasTransmissionSig: !!headers['paypal-transmission-sig'],
      bodyLength: body.length,
    });

    if (!headers['paypal-transmission-id'] || !headers['paypal-transmission-sig']) {
      console.error('[PayPal Webhook] Missing verification headers');
      return NextResponse.json(
        { error: 'Missing PayPal verification headers' },
        { status: 400 }
      );
    }

    // Verify webhook signature (can be skipped for debugging)
    let isValid = false;
    if (SKIP_VERIFICATION) {
      console.warn('[PayPal Webhook] ⚠️ SIGNATURE VERIFICATION SKIPPED - Remove PAYPAL_SKIP_WEBHOOK_VERIFICATION in production!');
      isValid = true;
    } else {
      isValid = await verifyWebhookSignature(headers, body);
    }
    
    if (!isValid) {
      console.error('[PayPal Webhook] Invalid signature - check PAYPAL_WEBHOOK_ID and PAYPAL_MODE');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event: PayPalEvent = JSON.parse(body);

    console.log('[PayPal Webhook] ✅ Received valid event:', {
      id: event.id,
      type: event.event_type,
      created: event.create_time,
      resourceId: event.resource?.id || 'N/A',
    });

    const result = await handlePayPalWebhook({
      event_type: event.event_type,
      resource: event.resource,
    });

    if (!result.success) {
      console.error('[PayPal Webhook] Handler failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Webhook handler failed' },
        { status: 500 }
      );
    }

    console.log('[PayPal Webhook] ✅ Event processed successfully');
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[PayPal Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * PayPal webhooks don't need CORS or other methods
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
