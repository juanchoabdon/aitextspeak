import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';
const CRON_SECRET = process.env.CRON_SECRET;

// ============== PayPal Helpers ==============

async function getPayPalAccessToken(): Promise<string> {
  const baseUrl = PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

async function getPayPalSubscription(subscriptionId: string): Promise<{ status: string } | null> {
  try {
    if (!subscriptionId.startsWith('I-')) return null;

    const accessToken = await getPayPalAccessToken();
    const baseUrl = PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * GET /api/cron/sync-subscriptions
 * 
 * This endpoint is meant to be called by a cron job (e.g., Vercel Cron)
 * to periodically sync subscription statuses with payment providers.
 * 
 * 3 LAYERS OF PROTECTION:
 * 1. Immediate activation on redirect (subscription-callback route)
 * 2. PayPal webhooks for subscription events
 * 3. This cron job runs every 6 hours to catch anything missed
 * 
 * Vercel Cron config (see vercel.json)
 * Schedule: Every 6 hours (0 star/6 star star star)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const results = {
    stripe: { checked: 0, synced: 0, errors: 0 },
    paypal: { checked: 0, synced: 0, errors: 0 },
    healed: { created: 0, activated: 0 },
    cancelled: [] as string[],
  };

  // ============== Sync Stripe Subscriptions ==============
  
  const { data: stripeSubscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, provider_subscription_id, status')
    .eq('provider', 'stripe')
    .eq('status', 'active')
    .not('provider_subscription_id', 'like', 'pi_%')  // Skip one-time payments
    .not('provider_subscription_id', 'like', 'cs_%'); // Skip checkout sessions

  for (const sub of stripeSubscriptions || []) {
    results.stripe.checked++;
    
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.provider_subscription_id) as Stripe.Subscription;
      
      if (!['active', 'trialing'].includes(stripeSub.status)) {
        // Subscription is no longer active
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        await supabase
          .from('profiles')
          .update({ role: 'user' })
          .eq('id', sub.user_id)
          .neq('role', 'admin');

        results.stripe.synced++;
        results.cancelled.push(sub.user_id);
      } else {
        // Update period end - use 'any' to handle Stripe SDK type variations
        const periodEnd = (stripeSub as unknown as { current_period_end?: number }).current_period_end;
        if (periodEnd) {
          await supabase
            .from('subscriptions')
            .update({
              current_period_end: new Date(periodEnd * 1000).toISOString(),
            })
            .eq('id', sub.id);
        }
      }
    } catch (error: unknown) {
      const stripeError = error as { code?: string };
      if (stripeError.code === 'resource_missing') {
        // Subscription not found - mark as canceled
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('id', sub.id);

        await supabase
          .from('profiles')
          .update({ role: 'user' })
          .eq('id', sub.user_id)
          .neq('role', 'admin');

        results.stripe.synced++;
        results.cancelled.push(sub.user_id);
      } else {
        results.stripe.errors++;
      }
    }
  }

  // ============== Sync PayPal Subscriptions ==============
  
  const { data: paypalSubscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, provider_subscription_id, status')
    .in('provider', ['paypal', 'paypal_legacy'])
    .eq('status', 'active')
    .like('provider_subscription_id', 'I-%'); // Only actual subscriptions

  for (const sub of paypalSubscriptions || []) {
    results.paypal.checked++;
    
    try {
      const paypalSub = await getPayPalSubscription(sub.provider_subscription_id);
      
      if (!paypalSub || paypalSub.status !== 'ACTIVE') {
        // Subscription is no longer active
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        await supabase
          .from('profiles')
          .update({ role: 'user' })
          .eq('id', sub.user_id)
          .neq('role', 'admin');

        results.paypal.synced++;
        results.cancelled.push(sub.user_id);
      }
    } catch {
      results.paypal.errors++;
    }
  }

  // ============== AUTO-HEAL: Find PayPal payments without subscription records ==============
  
  // Get recent PayPal subscription payments (last 7 days) that might be missing subscription records
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentPayPalPayments } = await supabase
    .from('payment_history')
    .select('user_id, gateway_identifier')
    .eq('gateway', 'paypal')
    .eq('transaction_type', 'subscription')
    .like('gateway_identifier', 'I-%')
    .gte('created_at', sevenDaysAgo);

  for (const payment of recentPayPalPayments || []) {
    const subscriptionId = payment.gateway_identifier;
    const userId = payment.user_id;
    
    // Skip if missing required fields
    if (!subscriptionId || !userId) continue;
    
    // Check if subscription record exists
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('provider_subscription_id', subscriptionId)
      .single();

    if (!existingSub) {
      // No subscription record - check PayPal and create one
      console.log('[Cron Sync] ⚠️ Missing subscription for PayPal payment:', subscriptionId);
      
      try {
        const paypalSub = await getPayPalSubscription(subscriptionId);
        
        if (paypalSub && paypalSub.status === 'ACTIVE') {
          // Create missing subscription record
          const { error: createError } = await supabase.from('subscriptions').insert({
            user_id: userId,
            provider: 'paypal',
            provider_subscription_id: subscriptionId,
            status: 'active',
            plan_id: 'monthly',
            plan_name: 'Basic Plan',
            price_amount: 999, // $9.99
            price_currency: 'USD',
            billing_interval: 'month',
            is_legacy: false,
          });

          if (!createError) {
            console.log('[Cron Sync] ✅ Auto-healed subscription:', subscriptionId);
            results.healed.created++;

            // Ensure user has pro role
            await supabase
              .from('profiles')
              .update({ role: 'pro' })
              .eq('id', userId)
              .neq('role', 'admin');
            
            results.healed.activated++;
          }
        }
      } catch (error) {
        console.error('[Cron Sync] Error healing subscription:', subscriptionId, error);
      }
    }
  }

  // Log summary
  console.log('[Cron Sync] Subscription sync complete:', {
    stripe: results.stripe,
    paypal: results.paypal,
    healed: results.healed,
    totalCancelled: results.cancelled.length,
  });

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results: {
      stripe: results.stripe,
      paypal: results.paypal,
      healed: results.healed,
      cancelled: results.cancelled.length,
    },
  });
}

