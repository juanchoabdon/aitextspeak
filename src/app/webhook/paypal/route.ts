import { NextRequest, NextResponse } from 'next/server';
import { handlePayPalWebhook, verifyWebhookSignature } from '@/lib/payments/paypal';

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

    if (!headers['paypal-transmission-id'] || !headers['paypal-transmission-sig']) {
      console.error('PayPal webhook: Missing verification headers');
      return NextResponse.json(
        { error: 'Missing PayPal verification headers' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(headers, body);
    
    if (!isValid) {
      console.error('PayPal webhook: Invalid signature');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    const event: PayPalEvent = JSON.parse(body);

    console.log('PayPal webhook received:', {
      id: event.id,
      type: event.event_type,
      created: event.create_time,
    });

    const result = await handlePayPalWebhook({
      event_type: event.event_type,
      resource: event.resource,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Webhook handler failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
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
