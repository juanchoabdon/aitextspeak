import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/payments/stripe';
import { getPlanByStripePrice } from '@/lib/payments/plans';
import {
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';

/**
 * POST /api/checkout/stripe/activate
 * 
 * Immediately activate a Stripe subscription from the checkout session.
 * Called client-side after successful payment redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing sessionId or userId' },
        { status: 400 }
      );
    }

    // Verify the requesting user owns this session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    // Verify this session belongs to this user
    if (session.metadata?.userId !== userId) {
      console.log('[Stripe Activate] Session userId mismatch');
      return NextResponse.json(
        { error: 'Session mismatch' },
        { status: 400 }
      );
    }

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      console.log('[Stripe Activate] Payment not yet paid');
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Check if user is already pro
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'pro') {
      console.log('[Stripe Activate] User already pro');
      return NextResponse.json({ success: true, alreadyActivated: true });
    }

    console.log('[Stripe Activate] Activating user:', userId);

    // Handle subscription vs one-time payment
    let planId = 'monthly';
    let amount = 0;
    let subscriptionId = '';
    let isRecurring = true;

    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionData = typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

      const subscription = subscriptionData as typeof subscriptionData & {
        current_period_start?: number;
        current_period_end?: number;
      };

      const plan = getPlanByStripePrice(subscription.items.data[0].price.id);
      planId = session.metadata?.planId || plan?.id || 'monthly';
      amount = (subscription.items.data[0].price.unit_amount || 0) / 100;
      subscriptionId = subscription.id;
      isRecurring = true;

      await adminClient.from('subscriptions').upsert({
        user_id: userId,
        provider: 'stripe',
        provider_subscription_id: subscription.id,
        provider_customer_id: session.customer as string,
        status: 'active',
        plan_id: planId,
        plan_name: plan?.name || planId,
        price_amount: subscription.items.data[0].price.unit_amount || 0,
        price_currency: subscription.currency.toUpperCase(),
        billing_interval: subscription.items.data[0].price.recurring?.interval as 'month' | 'year',
        current_period_start: subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString() 
          : null,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
        is_legacy: false,
      }, {
        onConflict: 'provider,provider_subscription_id',
      });
    } else {
      // One-time payment (lifetime)
      planId = 'lifetime';
      amount = (session.amount_total || 0) / 100;
      subscriptionId = session.payment_intent as string;
      isRecurring = false;

      await adminClient.from('subscriptions').upsert({
        user_id: userId,
        provider: 'stripe',
        provider_subscription_id: session.payment_intent as string,
        provider_customer_id: session.customer as string,
        status: 'active',
        plan_id: 'lifetime',
        plan_name: 'Lifetime',
        price_amount: session.amount_total || 0,
        price_currency: session.currency?.toUpperCase() || 'USD',
        billing_interval: null,
        is_legacy: false,
      }, {
        onConflict: 'provider,provider_subscription_id',
      });
    }

    // Update user role to pro
    await adminClient
      .from('profiles')
      .update({ role: 'pro' })
      .eq('id', userId);

    // Track in Amplitude
    trackPaymentCompleted(userId, {
      planId,
      amount,
      provider: 'stripe',
      isRecurring,
      currency: session.currency?.toUpperCase() || 'USD',
      subscriptionId,
    });

    if (isRecurring) {
      trackSubscriptionActivatedServer(userId, {
        planId,
        provider: 'stripe',
        subscriptionId,
      });
    }

    await flushAmplitude();

    console.log('[Stripe Activate] ✅ User activated');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Stripe Activate] Error:', error);
    return NextResponse.json(
      { error: 'Activation failed' },
      { status: 500 }
    );
  }
}

