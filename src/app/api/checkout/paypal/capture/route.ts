import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { capturePayPalOrder, getPayPalOrder, insertPaymentHistorySafe } from '@/lib/payments/paypal';
import { PLANS } from '@/lib/payments/plans';
import {
  trackPaymentCompleted,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';

/**
 * GET /api/checkout/paypal/capture
 * 
 * This is called after the user approves the PayPal payment.
 * PayPal redirects here with the token (order ID).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token'); // PayPal order ID
  const userId = searchParams.get('user_id');
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/pricing?error=missing_token`);
  }

  try {
    // Get order details to verify
    const order = await getPayPalOrder(token);
    
    if (!order) {
      return NextResponse.redirect(`${baseUrl}/pricing?error=order_not_found`);
    }

    // Get the user ID from the order
    const orderUserId = order.purchase_units?.[0]?.custom_id || 
                        order.purchase_units?.[0]?.reference_id || 
                        userId;

    if (!orderUserId) {
      return NextResponse.redirect(`${baseUrl}/pricing?error=user_not_found`);
    }

    // Capture the payment
    const captureResult = await capturePayPalOrder(token);

    if (!captureResult.success) {
      console.error('PayPal capture failed:', captureResult.error);
      return NextResponse.redirect(`${baseUrl}/pricing?error=capture_failed`);
    }

    // Create subscription record in database
    const supabase = createAdminClient();
    const plan = PLANS.lifetime;

    await supabase.from('subscriptions').upsert({
      user_id: orderUserId,
      provider: 'paypal',
      provider_subscription_id: token, // Use order ID as subscription ID
      provider_customer_id: captureResult.payerId || null,
      status: 'active',
      plan_id: 'lifetime',
      plan_name: 'Lifetime',
      // subscriptions.price_amount is stored as INTEGER cents in the DB
      price_amount: Math.round(plan.price * 100),
      price_currency: 'USD',
      billing_interval: null,
      is_legacy: false,
    }, {
      // Use guaranteed unique constraint (provider, provider_subscription_id)
      onConflict: 'provider,provider_subscription_id',
    });

    // Save transaction to payment_history (with duplicate prevention)
    await insertPaymentHistorySafe(supabase, {
      user_id: orderUserId,
      transaction_type: 'one_time',
      gateway: 'paypal',
      gateway_identifier: captureResult.captureId || token, // Use capture ID for unique identification
      currency: 'USD',
      amount: plan.price,
      item_name: 'Lifetime Package',
      redirect_status: 'success',
      callback_status: 'success',
      visible_for_user: true,
      metadata: {
        plan_id: 'lifetime',
        capture_id: captureResult.captureId,
        payer_id: captureResult.payerId,
        order_id: token,
      },
    });

    // Update user role to 'pro'
    await supabase
      .from('profiles')
      .update({ role: 'pro' })
      .eq('id', orderUserId);

    // Track in Amplitude
    trackPaymentCompleted(orderUserId, {
      planId: 'lifetime',
      amount: plan.price,
      provider: 'paypal',
      isRecurring: false,
      currency: 'USD',
      subscriptionId: token,
    });

    await flushAmplitude();

    // Redirect to projects page with success toast
    return NextResponse.redirect(`${baseUrl}/dashboard/projects?payment=success&provider=paypal`);
  } catch (error) {
    console.error('PayPal capture error:', error);
    return NextResponse.redirect(`${baseUrl}/pricing?error=capture_error`);
  }
}







