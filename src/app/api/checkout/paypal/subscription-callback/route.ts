import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getPayPalSubscription } from '@/lib/payments/paypal';
import { PLANS, type PlanId } from '@/lib/payments/plans';

/**
 * GET /api/checkout/paypal/subscription-callback
 * 
 * This is called after the user approves a PayPal subscription.
 * PayPal redirects here with the subscription_id.
 * We verify the subscription status and activate the user immediately.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subscriptionId = searchParams.get('subscription_id'); // PayPal passes this
  const userId = searchParams.get('user_id');
  const planId = searchParams.get('plan_id') as PlanId | null;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  console.log('[PayPal Subscription Callback] Received:', { subscriptionId, userId, planId });

  if (!subscriptionId || !userId) {
    console.error('[PayPal Subscription Callback] Missing required params');
    return NextResponse.redirect(`${baseUrl}/pricing?error=missing_params`);
  }

  try {
    // Get subscription details from PayPal API
    const subscription = await getPayPalSubscription(subscriptionId);
    
    if (!subscription) {
      console.error('[PayPal Subscription Callback] Subscription not found:', subscriptionId);
      return NextResponse.redirect(`${baseUrl}/pricing?error=subscription_not_found`);
    }

    console.log('[PayPal Subscription Callback] PayPal status:', subscription.status);

    const supabase = createAdminClient();
    const plan = planId && PLANS[planId] ? PLANS[planId] : PLANS.monthly;

    // Determine DB status based on PayPal status
    const dbStatus = subscription.status === 'ACTIVE' ? 'active' : 'incomplete';

    // Create/update subscription record in database
    await supabase.from('subscriptions').upsert({
      user_id: userId,
      provider: 'paypal',
      provider_subscription_id: subscriptionId,
      provider_customer_id: subscription.subscriber?.payer_id || null,
      status: dbStatus,
      plan_id: planId || 'monthly',
      plan_name: plan.name,
      // subscriptions.price_amount is stored as INTEGER cents in the DB
      price_amount: Math.round(plan.price * 100),
      price_currency: 'USD',
      billing_interval: plan.interval as 'month' | 'year' | null,
      current_period_start: subscription.start_time || null,
      current_period_end: subscription.billing_info?.next_billing_time || null,
      is_legacy: false,
    }, {
      onConflict: 'provider,provider_subscription_id',
    });

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
        await supabase.from('payment_history').insert({
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
      }

      // Update user role to pro
      await supabase
        .from('profiles')
        .update({ role: 'pro' })
        .eq('id', userId);

      console.log('[PayPal Subscription Callback] ✅ User activated immediately');
    } else {
      console.log('[PayPal Subscription Callback] Subscription not yet ACTIVE, webhook will handle activation');
    }

    // Redirect to billing page with success
    return NextResponse.redirect(`${baseUrl}/dashboard/billing?success=true&provider=paypal`);
  } catch (error) {
    console.error('[PayPal Subscription Callback] Error:', error);
    return NextResponse.redirect(`${baseUrl}/pricing?error=callback_error`);
  }
}

