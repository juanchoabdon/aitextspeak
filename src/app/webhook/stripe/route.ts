import { NextRequest, NextResponse } from 'next/server';

/**
 * Stripe Webhook Types
 * These will be expanded when implementing full webhook handling
 */
interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

/**
 * POST /webhook/stripe
 * 
 * Handles Stripe webhook events for:
 * - subscription.created
 * - subscription.updated
 * - subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 * - customer.subscription.trial_will_end
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

    // TODO: Verify signature with stripe.webhooks.constructEvent()
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    // const event = stripe.webhooks.constructEvent(
    //   body,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET!
    // );

    // For now, just parse the body (REMOVE IN PRODUCTION)
    const event: StripeEvent = JSON.parse(body);

    // Log the event for debugging
    console.log('Stripe webhook received:', {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
    });

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        console.log('Subscription created:', event.data.object);
        // TODO: Create subscription record in database
        break;

      case 'customer.subscription.updated':
        console.log('Subscription updated:', event.data.object);
        // TODO: Update subscription status in database
        break;

      case 'customer.subscription.deleted':
        console.log('Subscription deleted:', event.data.object);
        // TODO: Mark subscription as canceled in database
        break;

      case 'invoice.paid':
        console.log('Invoice paid:', event.data.object);
        // TODO: Update subscription period dates
        break;

      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object);
        // TODO: Handle failed payment (notify user, update status)
        break;

      case 'customer.subscription.trial_will_end':
        console.log('Trial ending soon:', event.data.object);
        // TODO: Send reminder email
        break;

      default:
        console.log('Unhandled event type:', event.type);
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

