import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

// New PayPal credentials
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
// Legacy PayPal credentials
const PAYPAL_LEGACY_CLIENT_ID = process.env.PAYPAL_LEGACY_CLIENT_ID;
const PAYPAL_LEGACY_CLIENT_SECRET = process.env.PAYPAL_LEGACY_CLIENT_SECRET;

const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';
const CRON_SECRET = process.env.CRON_SECRET;

interface PayPalSubscriptionDetails {
  id: string;
  status: string;
  plan_id?: string;
  subscriber?: {
    email_address?: string;
    name?: { given_name?: string; surname?: string };
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: { amount?: { value?: string } };
  };
  create_time?: string;
}

// ============== PayPal Helpers ==============

async function getPayPalAccessToken(isLegacy: boolean = false): Promise<string> {
  const baseUrl = PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  
  const clientId = isLegacy ? PAYPAL_LEGACY_CLIENT_ID : PAYPAL_CLIENT_ID;
  const clientSecret = isLegacy ? PAYPAL_LEGACY_CLIENT_SECRET : PAYPAL_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error(`PayPal ${isLegacy ? 'Legacy' : ''} credentials not configured`);
  }
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
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

async function getPayPalSubscription(subscriptionId: string, isLegacy: boolean = false): Promise<PayPalSubscriptionDetails | null> {
  try {
    if (!subscriptionId.startsWith('I-')) return null;

    const accessToken = await getPayPalAccessToken(isLegacy);
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

// ============== Discovery: Find subscriptions in providers but not in DB ==============

async function discoverStripeSubscriptions(supabase: ReturnType<typeof createAdminClient>) {
  const discovered: { subId: string; email: string; created: boolean }[] = [];
  
  try {
    // Fetch all active subscriptions from Stripe (paginated)
    let hasMore = true;
    let startingAfter: string | undefined;
    
    while (hasMore) {
      const params: Stripe.SubscriptionListParams = {
        status: 'active',
        limit: 100,
      };
      if (startingAfter) params.starting_after = startingAfter;
      
      const stripeSubs = await stripe.subscriptions.list(params);
      
      for (const stripeSub of stripeSubs.data) {
        // Check if this subscription exists in our DB
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('provider_subscription_id', stripeSub.id)
          .single();
        
        if (!existingSub) {
          // Subscription in Stripe but NOT in our DB!
          const customer = await stripe.customers.retrieve(stripeSub.customer as string) as Stripe.Customer;
          const email = customer.email || '';
          
          // Find or create user
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('email', email)
            .single();
          
          if (profile) {
            // Create missing subscription record
            const priceId = stripeSub.items.data[0]?.price?.id;
            const amount = stripeSub.items.data[0]?.price?.unit_amount || 999;
            
            // Cast to access current_period_end
            const subData = stripeSub as unknown as { current_period_end?: number };
            const periodEnd = subData.current_period_end 
              ? new Date(subData.current_period_end * 1000).toISOString()
              : null;
            
            const { error } = await supabase.from('subscriptions').insert({
              user_id: profile.id,
              provider: 'stripe',
              provider_subscription_id: stripeSub.id,
              status: 'active',
              plan_id: priceId?.includes('29') ? 'monthly_pro' : 'monthly',
              plan_name: amount >= 2999 ? 'Pro Plan' : 'Basic Plan',
              price_amount: amount,
              price_currency: 'USD',
              billing_interval: 'month',
              current_period_end: periodEnd,
              is_legacy: false,
            });
            
            if (!error) {
              // Ensure user has pro role
              await supabase
                .from('profiles')
                .update({ role: 'pro' })
                .eq('id', profile.id)
                .neq('role', 'admin');
              
              discovered.push({ subId: stripeSub.id, email, created: true });
              console.log('[Cron Discovery] ✅ Created Stripe subscription:', stripeSub.id, email);
            }
          } else {
            console.log('[Cron Discovery] ⚠️ Stripe subscription without matching user:', stripeSub.id, email);
            discovered.push({ subId: stripeSub.id, email, created: false });
          }
        }
      }
      
      hasMore = stripeSubs.has_more;
      if (stripeSubs.data.length > 0) {
        startingAfter = stripeSubs.data[stripeSubs.data.length - 1].id;
      }
    }
  } catch (error) {
    console.error('[Cron Discovery] Error discovering Stripe subscriptions:', error);
  }
  
  return discovered;
}

async function discoverPayPalSubscriptions(
  supabase: ReturnType<typeof createAdminClient>,
  subscriptionIds: string[],
  isLegacy: boolean
) {
  const discovered: { subId: string; email: string; created: boolean }[] = [];
  const provider = isLegacy ? 'paypal_legacy' : 'paypal';
  
  for (const subId of subscriptionIds) {
    // Check if this subscription exists in our DB
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('provider_subscription_id', subId)
      .single();
    
    if (!existingSub) {
      // Subscription in PayPal but NOT in our DB!
      const ppSub = await getPayPalSubscription(subId, isLegacy);
      
      if (ppSub && ppSub.status === 'ACTIVE') {
        const email = ppSub.subscriber?.email_address || '';
        
        // Find user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('email', email)
          .single();
        
        if (profile) {
          // Create missing subscription record
          const amount = parseFloat(ppSub.billing_info?.last_payment?.amount?.value || '9.99') * 100;
          
          const { error } = await supabase.from('subscriptions').insert({
            user_id: profile.id,
            provider,
            provider_subscription_id: subId,
            status: 'active',
            plan_id: amount >= 2999 ? 'monthly_pro' : 'monthly',
            plan_name: amount >= 2999 ? 'Pro Plan' : 'Basic Plan',
            price_amount: Math.round(amount),
            price_currency: 'USD',
            billing_interval: 'month',
            current_period_end: ppSub.billing_info?.next_billing_time || null,
            is_legacy: isLegacy,
          });
          
          if (!error) {
            // Ensure user has pro role
            await supabase
              .from('profiles')
              .update({ role: 'pro' })
              .eq('id', profile.id)
              .neq('role', 'admin');
            
            discovered.push({ subId, email, created: true });
            console.log(`[Cron Discovery] ✅ Created ${provider} subscription:`, subId, email);
          }
        } else {
          console.log(`[Cron Discovery] ⚠️ ${provider} subscription without matching user:`, subId, email);
          discovered.push({ subId, email, created: false });
        }
      }
    }
  }
  
  return discovered;
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
    stripe: { checked: 0, synced: 0, errors: 0, pastDue: 0 },
    paypal: { checked: 0, synced: 0, errors: 0 },
    paypal_legacy: { checked: 0, synced: 0, errors: 0, skipped: 0 },
    healed: { created: 0, activated: 0 },
    discovered: { stripe: 0, paypal: 0, paypal_legacy: 0 },
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
      
      // Extract Stripe data with proper typing
      const stripeData = stripeSub as unknown as { 
        status: string;
        current_period_end?: number;
        cancel_at?: number | null;
        canceled_at?: number | null;
        cancel_at_period_end?: boolean;
      };
      
      // Check for scheduled cancellations (user canceled but still has access)
      if (stripeData.cancel_at_period_end || stripeData.cancel_at) {
        // User has scheduled cancellation - update our DB with this info
        const updates: Record<string, string | null> = {};
        
        if (stripeData.cancel_at) {
          updates.cancel_at = new Date(stripeData.cancel_at * 1000).toISOString();
        }
        if (stripeData.canceled_at) {
          updates.canceled_at = new Date(stripeData.canceled_at * 1000).toISOString();
        }
        if (stripeData.current_period_end) {
          updates.current_period_end = new Date(stripeData.current_period_end * 1000).toISOString();
        }
        
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('subscriptions')
            .update(updates)
            .eq('id', sub.id);
        }
        
        // Don't count as synced/canceled - they're still active in grace period
        continue;
      }
      
      if (!['active', 'trialing'].includes(stripeData.status)) {
        // Subscription is no longer active in Stripe
        // Update our record with all the details
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: stripeData.canceled_at 
              ? new Date(stripeData.canceled_at * 1000).toISOString()
              : new Date().toISOString(),
            cancel_at: stripeData.cancel_at
              ? new Date(stripeData.cancel_at * 1000).toISOString()
              : null,
            current_period_end: stripeData.current_period_end
              ? new Date(stripeData.current_period_end * 1000).toISOString()
              : null,
          })
          .eq('id', sub.id);

        // Only downgrade user if grace period has ended
        const periodEnd = stripeData.current_period_end 
          ? new Date(stripeData.current_period_end * 1000) 
          : new Date();
        
        if (new Date() > periodEnd) {
          // Grace period ended - revoke access
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', sub.user_id)
            .neq('role', 'admin');
          
          results.cancelled.push(sub.user_id);
        }
        // If still in grace period, keep pro access

        results.stripe.synced++;
      } else {
        // Active subscription - update period end
        if (stripeData.current_period_end) {
          await supabase
            .from('subscriptions')
            .update({
              current_period_end: new Date(stripeData.current_period_end * 1000).toISOString(),
            })
            .eq('id', sub.id);
        }
      }
    } catch (error: unknown) {
      const stripeError = error as { code?: string };
      if (stripeError.code === 'resource_missing') {
        // Subscription not found in Stripe - mark as canceled
        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', canceled_at: new Date().toISOString() })
          .eq('id', sub.id);

        // Check if there's a grace period before downgrading
        if (sub.status === 'active') {
          // No grace period info available, check current_period_end from our DB
          const { data: dbSub } = await supabase
            .from('subscriptions')
            .select('current_period_end')
            .eq('id', sub.id)
            .single();
          
          const periodEnd = dbSub?.current_period_end 
            ? new Date(dbSub.current_period_end) 
            : new Date();
          
          if (new Date() > periodEnd) {
            await supabase
              .from('profiles')
              .update({ role: 'user' })
              .eq('id', sub.user_id)
              .neq('role', 'admin');
            
            results.cancelled.push(sub.user_id);
          }
        }

        results.stripe.synced++;
      } else {
        results.stripe.errors++;
      }
    }
  }

  // ============== Sync PayPal Subscriptions ==============
  
  const { data: paypalSubscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, provider_subscription_id, status, provider')
    .in('provider', ['paypal', 'paypal_legacy'])
    .eq('status', 'active')
    .like('provider_subscription_id', 'I-%'); // Only actual subscriptions

  for (const sub of paypalSubscriptions || []) {
    const isLegacy = sub.provider === 'paypal_legacy';
    const resultKey = isLegacy ? 'paypal_legacy' : 'paypal';
    
    results[resultKey].checked++;
    
    // Skip legacy subscriptions if credentials are not configured
    if (isLegacy && (!PAYPAL_LEGACY_CLIENT_ID || !PAYPAL_LEGACY_CLIENT_SECRET)) {
      console.log(`[Cron] Skipping legacy subscription ${sub.provider_subscription_id} - no legacy credentials`);
      results.paypal_legacy.skipped++;
      continue;
    }
    
    try {
      const paypalSub = await getPayPalSubscription(sub.provider_subscription_id, isLegacy) as {
        status: string;
        billing_info?: { next_billing_time?: string };
      } | null;
      
      if (!paypalSub || paypalSub.status !== 'ACTIVE') {
        // Subscription is no longer active in PayPal
        // Get the next billing time as the grace period end
        const periodEnd = paypalSub?.billing_info?.next_billing_time 
          ? new Date(paypalSub.billing_info.next_billing_time)
          : null;
        
        await supabase
          .from('subscriptions')
          .update({ 
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            // Preserve current_period_end for grace period
            ...(periodEnd && { current_period_end: periodEnd.toISOString() }),
          })
          .eq('id', sub.id);

        // Only downgrade user if grace period has ended (or no grace period)
        const shouldRevoke = !periodEnd || new Date() > periodEnd;
        
        if (shouldRevoke) {
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', sub.user_id)
            .neq('role', 'admin');
          
          results.cancelled.push(sub.user_id);
        }
        // If still in grace period, keep pro access

        results[resultKey].synced++;
      }
    } catch {
      results[resultKey].errors++;
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

  // ============== DISCOVERY: Find subscriptions in providers but not in our DB ==============
  
  console.log('[Cron Sync] Starting discovery phase - checking providers for missing subscriptions...');
  
  // 1. Discover missing Stripe subscriptions
  try {
    const stripeDiscovered = await discoverStripeSubscriptions(supabase);
    results.discovered.stripe = stripeDiscovered.filter(d => d.created).length;
    if (stripeDiscovered.length > 0) {
      console.log(`[Cron Discovery] Stripe: Found ${stripeDiscovered.length} subscriptions not in DB, created ${results.discovered.stripe}`);
    }
  } catch (error) {
    console.error('[Cron Discovery] Error during Stripe discovery:', error);
  }
  
  // 2. Discover missing PayPal (new) subscriptions
  // We need a list of subscription IDs from PayPal - we'll check our payment_history for any we might have missed
  try {
    const { data: paypalPayments } = await supabase
      .from('payment_history')
      .select('gateway_identifier')
      .eq('gateway', 'paypal')
      .like('gateway_identifier', 'I-%');
    
    const paypalSubIds = [...new Set((paypalPayments || []).map(p => p.gateway_identifier).filter(Boolean))] as string[];
    
    if (paypalSubIds.length > 0) {
      const paypalDiscovered = await discoverPayPalSubscriptions(supabase, paypalSubIds, false);
      results.discovered.paypal = paypalDiscovered.filter(d => d.created).length;
      if (paypalDiscovered.length > 0) {
        console.log(`[Cron Discovery] PayPal (new): Found ${paypalDiscovered.length} not in DB, created ${results.discovered.paypal}`);
      }
    }
  } catch (error) {
    console.error('[Cron Discovery] Error during PayPal discovery:', error);
  }
  
  // 3. Discover missing PayPal Legacy subscriptions (if credentials are configured)
  if (PAYPAL_LEGACY_CLIENT_ID && PAYPAL_LEGACY_CLIENT_SECRET) {
    try {
      const { data: legacyPayments } = await supabase
        .from('payment_history')
        .select('gateway_identifier')
        .eq('gateway', 'paypal_legacy')
        .like('gateway_identifier', 'I-%');
      
      const legacySubIds = [...new Set((legacyPayments || []).map(p => p.gateway_identifier).filter(Boolean))] as string[];
      
      if (legacySubIds.length > 0) {
        const legacyDiscovered = await discoverPayPalSubscriptions(supabase, legacySubIds, true);
        results.discovered.paypal_legacy = legacyDiscovered.filter(d => d.created).length;
        if (legacyDiscovered.length > 0) {
          console.log(`[Cron Discovery] PayPal Legacy: Found ${legacyDiscovered.length} not in DB, created ${results.discovered.paypal_legacy}`);
        }
      }
    } catch (error) {
      console.error('[Cron Discovery] Error during PayPal Legacy discovery:', error);
    }
  }

  // Log summary
  console.log('[Cron Sync] Subscription sync complete:', {
    stripe: results.stripe,
    paypal: results.paypal,
    paypal_legacy: results.paypal_legacy,
    discovered: results.discovered,
    healed: results.healed,
    totalCancelled: results.cancelled.length,
  });

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results: {
      stripe: results.stripe,
      paypal: results.paypal,
      paypal_legacy: results.paypal_legacy,
      discovered: results.discovered,
      healed: results.healed,
      cancelled: results.cancelled.length,
    },
  });
}

