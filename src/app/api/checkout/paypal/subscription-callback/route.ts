import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getPayPalSubscription } from '@/lib/payments/paypal';
import { PLANS, type PlanId } from '@/lib/payments/plans';
import {
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';

/**
 * GET /api/checkout/paypal/subscription-callback
 * 
 * This is called after the user approves a PayPal subscription.
 * PayPal redirects here with the subscription_id.
 * We verify the subscription status and activate the user immediately.
 * 
 * LAYER 1 OF 3: Immediate activation on redirect
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subscriptionId = searchParams.get('subscription_id'); // PayPal passes this
  const userId = searchParams.get('user_id');
  const planId = searchParams.get('plan_id') as PlanId | null;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  console.log('[PayPal Subscription Callback] Received:', { subscriptionId, userId, planId });

  // Log all params for debugging
  const allParams = Object.fromEntries(searchParams.entries());
  console.log('[PayPal Subscription Callback] All URL params:', allParams);

  if (!subscriptionId || !userId) {
    console.error('[PayPal Subscription Callback] ❌ Missing required params:', { subscriptionId, userId });
    // Still redirect to dashboard - user might have paid but we don't have the subscription_id
    return NextResponse.redirect(`${baseUrl}/dashboard/projects?payment=pending&error=missing_subscription_id`);
  }

  const supabase = createAdminClient();

  try {
    // Get subscription details from PayPal API
    const subscription = await getPayPalSubscription(subscriptionId);
    
    if (!subscription) {
      console.error('[PayPal Subscription Callback] ❌ Subscription not found in PayPal:', subscriptionId);
      return NextResponse.redirect(`${baseUrl}/pricing?error=subscription_not_found`);
    }

    console.log('[PayPal Subscription Callback] PayPal response:', {
      status: subscription.status,
      email: subscription.subscriber?.email_address,
      payerId: subscription.subscriber?.payer_id,
      startTime: subscription.start_time,
      nextBilling: subscription.billing_info?.next_billing_time,
    });

    const plan = planId && PLANS[planId] ? PLANS[planId] : PLANS.monthly;

    // Determine DB status based on PayPal status
    const dbStatus = subscription.status === 'ACTIVE' ? 'active' : 'incomplete';

    // Create/update subscription record in database
    const { error: upsertError } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      provider: 'paypal',
      provider_subscription_id: subscriptionId,
      provider_customer_id: subscription.subscriber?.payer_id || null,
      status: dbStatus,
      plan_id: planId || 'monthly',
      plan_name: plan.name,
      price_amount: Math.round(plan.price * 100),
      price_currency: 'USD',
      billing_interval: plan.interval as 'month' | 'year' | null,
      current_period_start: subscription.start_time || null,
      current_period_end: subscription.billing_info?.next_billing_time || null,
      is_legacy: false,
    }, {
      onConflict: 'provider,provider_subscription_id',
    });

    if (upsertError) {
      console.error('[PayPal Subscription Callback] ❌ Database upsert error:', upsertError);
      // Continue - don't fail the user experience
    } else {
      console.log('[PayPal Subscription Callback] ✅ Subscription record created/updated');
    }

    // If subscription is ACTIVE, update user role immediately
    if (subscription.status === 'ACTIVE') {
      console.log('[PayPal Subscription Callback] Subscription is ACTIVE, activating user');

      // Save payment history
      const { data: existingPayment } = await supabase
        .from('payment_history')
        .select('id')
        .eq('user_id', userId)
        .eq('gateway', 'paypal')
        .eq('gateway_identifier', subscriptionId)
        .eq('transaction_type', 'subscription')
        .single();

      if (!existingPayment) {
        const { error: paymentError } = await supabase.from('payment_history').insert({
          user_id: userId,
          transaction_type: 'subscription',
          gateway: 'paypal',
          gateway_identifier: subscriptionId,
          currency: 'USD',
          amount: plan.price,
          item_name: plan.name,
          redirect_status: 'success',
          callback_status: 'success',
          visible_for_user: true,
          metadata: {
            plan_id: planId,
            payer_id: subscription.subscriber?.payer_id,
          },
        });

        if (paymentError) {
          console.error('[PayPal Subscription Callback] ❌ Payment history error:', paymentError);
        }
      }

      // Update user role to pro
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'pro' })
        .eq('id', userId);

      if (roleError) {
        console.error('[PayPal Subscription Callback] ❌ Role update error:', roleError);
      } else {
        console.log('[PayPal Subscription Callback] ✅ User role set to pro');
      }

      // Track in Amplitude
      trackPaymentCompleted(userId, {
        planId: planId || 'monthly',
        amount: plan.price,
        provider: 'paypal',
        isRecurring: true,
        currency: 'USD',
        subscriptionId,
      });

      trackSubscriptionActivatedServer(userId, {
        planId: planId || 'monthly',
        provider: 'paypal',
        subscriptionId,
      });

      await flushAmplitude();

      console.log('[PayPal Subscription Callback] ✅ User activated immediately');
    } else {
      console.log('[PayPal Subscription Callback] ⏳ Subscription status:', subscription.status, '- webhook will handle activation');
    }

    // Redirect to projects page with success toast
    return NextResponse.redirect(`${baseUrl}/dashboard/projects?payment=success&provider=paypal`);
  } catch (error) {
    console.error('[PayPal Subscription Callback] ❌ Exception:', error);
    // Still redirect - don't leave user hanging
    return NextResponse.redirect(`${baseUrl}/dashboard/projects?payment=pending&error=processing`);
  }
}

