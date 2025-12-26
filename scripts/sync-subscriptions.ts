#!/usr/bin/env npx tsx
/**
 * Subscription Sync Script
 * 
 * Syncs our database with Stripe and PayPal to ensure consistency.
 * Run this periodically (daily recommended) to catch any missed webhooks.
 * 
 * Usage:
 *   npx tsx scripts/sync-subscriptions.ts              # Full sync
 *   npx tsx scripts/sync-subscriptions.ts --dry-run    # Preview changes
 *   npx tsx scripts/sync-subscriptions.ts --provider stripe  # Only Stripe
 *   npx tsx scripts/sync-subscriptions.ts --provider paypal  # Only PayPal
 */

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

// New PayPal account (for new subscriptions)
const paypalClientId = process.env.PAYPAL_CLIENT_ID!;
const paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET!;
const paypalMode = process.env.PAYPAL_MODE || 'live';

// Legacy PayPal account (for old subscriptions)
const paypalLegacyClientId = process.env.PAYPAL_LEGACY_CLIENT_ID || '';
const paypalLegacyClientSecret = process.env.PAYPAL_LEGACY_CLIENT_SECRET || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-10-16' as any });

// Type for Stripe subscription data
interface StripeSubData {
  id: string;
  status: string;
  customer: string | { id: string; email?: string };
  currency: string;
  current_period_start?: number;
  current_period_end?: number;
  canceled_at?: number | null;
  items: {
    data: Array<{
      price: {
        id: string;
        unit_amount?: number;
        recurring?: {
          interval?: string;
        };
      };
    }>;
  };
}

const isDryRun = process.argv.includes('--dry-run');
const providerFilter = process.argv.find(a => a.startsWith('--provider='))?.split('=')[1];

interface SyncResult {
  checked: number;
  updated: number;
  cancelled: number;
  created: number;  // New subscriptions discovered from provider
  errors: number;
  mismatches: Array<{
    userId: string;
    email: string;
    provider: string;
    ourStatus: string;
    providerStatus: string;
    action: string;
  }>;
}

// ============== PayPal API Helpers ==============

async function getPayPalAccessToken(useLegacy: boolean = false): Promise<string | null> {
  const clientId = useLegacy ? paypalLegacyClientId : paypalClientId;
  const clientSecret = useLegacy ? paypalLegacyClientSecret : paypalClientSecret;

  if (!clientId || !clientSecret) {
    return null;
  }

  const baseUrl = paypalMode === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch {
    return null;
  }
}

async function getPayPalSubscription(subscriptionId: string, useLegacy: boolean = false): Promise<{ status: string } | null> {
  try {
    const accessToken = await getPayPalAccessToken(useLegacy);
    if (!accessToken) {
      return null;
    }
    
    const baseUrl = paypalMode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`PayPal API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching PayPal subscription ${subscriptionId}:`, error);
    return null;
  }
}

// ============== Stripe Sync ==============

async function syncStripeSubscriptions(): Promise<SyncResult> {
  console.log('\n🔷 Syncing Stripe subscriptions...\n');
  
  const result: SyncResult = {
    checked: 0,
    updated: 0,
    cancelled: 0,
    created: 0,
    errors: 0,
    mismatches: [],
  };

  // Get all Stripe subscriptions from our DB
  const { data: ourSubs } = await supabase
    .from('subscriptions')
    .select('id, user_id, provider_subscription_id, status, plan_name')
    .eq('provider', 'stripe')
    .not('provider_subscription_id', 'like', 'legacy_fix_%');

  if (!ourSubs || ourSubs.length === 0) {
    console.log('No Stripe subscriptions found in database');
    return result;
  }

  for (const sub of ourSubs) {
    result.checked++;
    
    // Get user email for logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', sub.user_id)
      .single();
    
    const email = profile?.email || sub.user_id;

    try {
      // Skip one-time payments (payment intents, not subscriptions)
      if (sub.provider_subscription_id.startsWith('pi_') || 
          sub.provider_subscription_id.startsWith('cs_')) {
        // This is a one-time payment (lifetime), can't verify via subscription API
        // These should stay active
        continue;
      }

      // Query Stripe for current status
      const stripeSub = await stripe.subscriptions.retrieve(sub.provider_subscription_id) as unknown as StripeSubData;
      
      const stripeStatus = stripeSub.status;
      const ourStatus = sub.status;

      // Map Stripe statuses to our statuses
      let expectedStatus: string;
      if (['active', 'trialing'].includes(stripeStatus)) {
        expectedStatus = 'active';
      } else if (['canceled', 'unpaid', 'incomplete_expired'].includes(stripeStatus)) {
        expectedStatus = 'canceled';
      } else if (stripeStatus === 'past_due') {
        expectedStatus = 'past_due';
      } else if (stripeStatus === 'paused') {
        expectedStatus = 'paused';
      } else {
        expectedStatus = stripeStatus;
      }

      if (ourStatus !== expectedStatus) {
        result.mismatches.push({
          userId: sub.user_id,
          email,
          provider: 'stripe',
          ourStatus,
          providerStatus: stripeStatus,
          action: `Update to ${expectedStatus}`,
        });

        console.log(`⚠️  ${email}: Mismatch - Ours: ${ourStatus}, Stripe: ${stripeStatus}`);

        if (!isDryRun) {
          await supabase
            .from('subscriptions')
            .update({ 
              status: expectedStatus,
              current_period_end: stripeSub.current_period_end 
                ? new Date(stripeSub.current_period_end * 1000).toISOString() 
                : null,
              canceled_at: stripeSub.canceled_at 
                ? new Date(stripeSub.canceled_at * 1000).toISOString() 
                : null,
            })
            .eq('id', sub.id);

          // Update user role if subscription is no longer active
          if (expectedStatus !== 'active') {
            await supabase
              .from('profiles')
              .update({ role: 'user' })
              .eq('id', sub.user_id)
              .neq('role', 'admin');
            result.cancelled++;
          }

          result.updated++;
        }
      } else {
        // Status matches, but sync period end dates
        if (!isDryRun && stripeSub.current_period_end) {
          await supabase
            .from('subscriptions')
            .update({
              current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
            })
            .eq('id', sub.id);
        }
      }
    } catch (error: unknown) {
      const stripeError = error as { code?: string; message?: string };
      if (stripeError.code === 'resource_missing') {
        // Subscription doesn't exist in Stripe - mark as canceled
        result.mismatches.push({
          userId: sub.user_id,
          email,
          provider: 'stripe',
          ourStatus: sub.status,
          providerStatus: 'not_found',
          action: 'Mark as canceled',
        });

        console.log(`❌ ${email}: Subscription not found in Stripe`);

        if (!isDryRun && sub.status === 'active') {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled', canceled_at: new Date().toISOString() })
            .eq('id', sub.id);

          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', sub.user_id)
            .neq('role', 'admin');

          result.cancelled++;
          result.updated++;
        }
      } else {
        console.error(`Error checking ${email}:`, stripeError.message);
        result.errors++;
      }
    }
  }

  // ============== Discover Missing Stripe Subscriptions ==============
  // Find active subscriptions in Stripe that we don't have in our database
  console.log('\n🔍 Discovering missing Stripe subscriptions...\n');
  
  try {
    // Get all known Stripe subscription IDs from our DB
    const knownSubIds = new Set(
      ourSubs
        .filter(s => s.provider_subscription_id.startsWith('sub_'))
        .map(s => s.provider_subscription_id)
    );

    // List all active subscriptions from Stripe
    let hasMore = true;
    let startingAfter: string | undefined;
    
    while (hasMore) {
      const stripeList = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer'],
      });

      for (const stripeSubRaw of stripeList.data) {
        const stripeSub = stripeSubRaw as unknown as StripeSubData & { customer: { id: string; email?: string } };
        // Skip if we already have this subscription
        if (knownSubIds.has(stripeSub.id)) {
          continue;
        }

        // Get customer email to find user
        const customer = stripeSub.customer;
        const customerEmail = customer?.email;

        if (!customerEmail) {
          console.log(`⚠️  Stripe sub ${stripeSub.id}: No customer email, skipping`);
          continue;
        }

        // Find user by email
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, role')
          .ilike('email', customerEmail)
          .single();

        if (!profile) {
          console.log(`⚠️  Stripe sub ${stripeSub.id}: User not found for ${customerEmail}`);
          continue;
        }

        // Check if user already has an active subscription
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', profile.id)
          .eq('status', 'active')
          .single();

        if (existingSub) {
          console.log(`ℹ️  ${customerEmail}: Already has active subscription, skipping Stripe sub ${stripeSub.id}`);
          continue;
        }

        // Determine plan info from Stripe price
        const priceAmount = stripeSub.items.data[0]?.price?.unit_amount || 0;
        const interval = stripeSub.items.data[0]?.price?.recurring?.interval;
        
        // Try to match to a known plan, or create a custom one
        let planId = 'unknown';
        let planName = 'Unknown Plan';
        
        if (priceAmount <= 1000) { // $10 or less
          planId = 'monthly';
          planName = 'Basic Plan';
        } else if (priceAmount <= 3500) { // $35 or less
          planId = 'monthly_pro';
          planName = 'Pro Plan';
        } else {
          planName = `Custom Plan ($${(priceAmount / 100).toFixed(2)}/${interval || 'unknown'})`;
        }

        result.mismatches.push({
          userId: profile.id,
          email: customerEmail,
          provider: 'stripe',
          ourStatus: 'missing',
          providerStatus: 'active',
          action: `Create subscription (${planName})`,
        });

        console.log(`🆕 ${customerEmail}: Missing subscription ${stripeSub.id} (${planName})`);

        if (!isDryRun) {
          // Create the subscription record
          await supabase.from('subscriptions').upsert({
            user_id: profile.id,
            provider: 'stripe',
            provider_subscription_id: stripeSub.id,
            provider_customer_id: typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id,
            status: 'active',
            plan_id: planId,
            plan_name: planName,
            price_amount: priceAmount,
            price_currency: stripeSub.currency.toUpperCase(),
            billing_interval: interval as 'month' | 'year' | null,
            current_period_start: stripeSub.current_period_start 
              ? new Date(stripeSub.current_period_start * 1000).toISOString() 
              : null,
            current_period_end: stripeSub.current_period_end 
              ? new Date(stripeSub.current_period_end * 1000).toISOString() 
              : null,
            is_legacy: false,
          }, {
            onConflict: 'provider,provider_subscription_id',
          });

          // Update user role to pro
          await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', profile.id);

          result.created++;
        }
      }

      hasMore = stripeList.has_more;
      if (stripeList.data.length > 0) {
        startingAfter = stripeList.data[stripeList.data.length - 1].id;
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error discovering Stripe subscriptions:', err.message);
    result.errors++;
  }

  return result;
}

// ============== PayPal Sync ==============

async function syncPayPalSubscriptions(): Promise<SyncResult> {
  console.log('\n🔶 Syncing PayPal subscriptions...\n');
  
  const result: SyncResult = {
    checked: 0,
    updated: 0,
    cancelled: 0,
    created: 0,
    errors: 0,
    mismatches: [],
  };

  // Get all PayPal subscriptions from our DB (both new and legacy)
  const { data: ourSubs } = await supabase
    .from('subscriptions')
    .select('id, user_id, provider_subscription_id, status, plan_name, provider')
    .in('provider', ['paypal', 'paypal_legacy'])
    .not('provider_subscription_id', 'like', 'legacy_fix_%');

  if (!ourSubs || ourSubs.length === 0) {
    console.log('No PayPal subscriptions found in database');
    return result;
  }

  for (const sub of ourSubs) {
    result.checked++;
    
    // Get user email for logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', sub.user_id)
      .single();
    
    const email = profile?.email || sub.user_id;

    // Skip capture IDs (one-time payments)
    if (!sub.provider_subscription_id.startsWith('I-')) {
      continue;
    }

    // Use legacy PayPal credentials for legacy subscriptions
    const useLegacy = sub.provider === 'paypal_legacy';

    try {
      const paypalSub = await getPayPalSubscription(sub.provider_subscription_id, useLegacy);
      
      if (!paypalSub) {
        // Subscription not found in PayPal
        result.mismatches.push({
          userId: sub.user_id,
          email,
          provider: sub.provider,
          ourStatus: sub.status,
          providerStatus: 'not_found',
          action: 'Mark as canceled',
        });

        console.log(`❌ ${email}: Subscription not found in PayPal (${useLegacy ? 'legacy' : 'new'})`);

        if (!isDryRun && sub.status === 'active') {
          await supabase
            .from('subscriptions')
            .update({ status: 'canceled', canceled_at: new Date().toISOString() })
            .eq('id', sub.id);

          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', sub.user_id)
            .neq('role', 'admin');

          result.cancelled++;
          result.updated++;
        }
        continue;
      }

      const paypalStatus = paypalSub.status;
      const ourStatus = sub.status;

      // Map PayPal statuses to our statuses
      let expectedStatus: string;
      if (paypalStatus === 'ACTIVE') {
        expectedStatus = 'active';
      } else if (['CANCELLED', 'EXPIRED', 'SUSPENDED'].includes(paypalStatus)) {
        expectedStatus = 'canceled';
      } else {
        expectedStatus = paypalStatus.toLowerCase();
      }

      if (ourStatus !== expectedStatus) {
        result.mismatches.push({
          userId: sub.user_id,
          email,
          provider: sub.provider,
          ourStatus,
          providerStatus: paypalStatus,
          action: `Update to ${expectedStatus}`,
        });

        console.log(`⚠️  ${email}: Mismatch - Ours: ${ourStatus}, PayPal: ${paypalStatus}`);

        if (!isDryRun) {
          await supabase
            .from('subscriptions')
            .update({ 
              status: expectedStatus,
              canceled_at: expectedStatus === 'canceled' ? new Date().toISOString() : null,
            })
            .eq('id', sub.id);

          // Update user role if subscription is no longer active
          if (expectedStatus !== 'active') {
            await supabase
              .from('profiles')
              .update({ role: 'user' })
              .eq('id', sub.user_id)
              .neq('role', 'admin');
            result.cancelled++;
          }

          result.updated++;
        }
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      console.error(`Error checking ${email}:`, err.message);
      result.errors++;
    }
  }

  return result;
}

// ============== Sync Plans from Stripe ==============

interface PlanSyncResult {
  checked: number;
  created: number;
  updated: number;
  errors: number;
}

async function syncStripePlans(): Promise<PlanSyncResult> {
  console.log('\n📦 Syncing Stripe plans/products...\n');
  
  const result: PlanSyncResult = {
    checked: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  try {
    // Check if plans table exists
    const { data: existingPlans, error: plansError } = await supabase
      .from('plans')
      .select('id, stripe_price_id');
    
    if (plansError && plansError.message.includes('does not exist')) {
      console.log('⚠️  Plans table does not exist. Run migration first:');
      console.log('   supabase/migrations/20241226000001_create_plans_table.sql');
      console.log('   Or run via Supabase Dashboard > SQL Editor');
      return result;
    }

    const knownPriceIds = new Set(
      (existingPlans || [])
        .filter(p => p.stripe_price_id)
        .map(p => p.stripe_price_id)
    );

    // First, collect all price IDs that have active subscriptions
    console.log('   Collecting prices with active subscriptions...');
    const pricesInUse = new Set<string>();
    
    let hasMoreSubs = true;
    let subStartingAfter: string | undefined;
    
    while (hasMoreSubs) {
      const subList = await stripe.subscriptions.list({
        status: 'active',
        limit: 100,
        starting_after: subStartingAfter,
      });

      for (const sub of subList.data) {
        for (const item of sub.items.data) {
          pricesInUse.add(item.price.id);
        }
      }

      hasMoreSubs = subList.has_more;
      if (subList.data.length > 0) {
        subStartingAfter = subList.data[subList.data.length - 1].id;
      }
    }

    console.log(`   Found ${pricesInUse.size} prices with active subscriptions`);

    // Only sync prices that are in use and not already known
    const pricesToSync = [...pricesInUse].filter(id => !knownPriceIds.has(id));
    
    if (pricesToSync.length === 0) {
      console.log('   All prices with active subscriptions are already in database');
      return result;
    }

    console.log(`   Syncing ${pricesToSync.length} new prices...`);

    for (const priceId of pricesToSync) {
      result.checked++;

      try {
        const price = await stripe.prices.retrieve(priceId, {
          expand: ['product'],
        });

        // Get product info
        const product = price.product as Stripe.Product;
        const productName = typeof product === 'object' ? product.name : 'Unknown Product';
        const productId = typeof product === 'object' ? product.id : product;
        const interval = price.recurring?.interval || 'one_time';
        const amount = price.unit_amount || 0;

        // Use product ID as the base for plan ID to avoid duplicates
        const planId = `stripe_${productId.substring(0, 15)}_${interval}`;

        console.log(`🆕 Discovered: ${productName} ($${(amount / 100).toFixed(2)}/${interval}) - ${priceId}`);

        if (!isDryRun) {
          const { error } = await supabase.from('plans').upsert({
            id: planId,
            name: productName,
            description: typeof product === 'object' ? product.description : null,
            price_amount: amount,
            price_currency: price.currency.toUpperCase(),
            billing_interval: interval,
            characters_per_month: amount <= 1500 ? 1000000 : -1, // Basic gets 1M, Pro/Elite get unlimited
            stripe_price_id: priceId,
            is_active: true,
            is_legacy: false,
            is_discovered: true,
            metadata: {
              stripe_product_id: productId,
              discovered_at: new Date().toISOString(),
            },
          }, {
            onConflict: 'id',
          });

          if (error) {
            console.error(`Error creating plan ${planId}:`, error.message);
            result.errors++;
          } else {
            result.created++;
          }
        } else {
          result.created++;
        }
      } catch (priceError: unknown) {
        const err = priceError as { message?: string };
        console.error(`Error fetching price ${priceId}:`, err.message);
        result.errors++;
      }
    }
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error('Error syncing Stripe plans:', err.message);
    result.errors++;
  }

  return result;
}

// ============== Main ==============

async function main() {
  console.log(`🔄 Subscription Sync ${isDryRun ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`   Provider filter: ${providerFilter || 'all'}`);
  console.log('='.repeat(50));

  let stripeResult: SyncResult | null = null;
  let paypalResult: SyncResult | null = null;
  let planResult: PlanSyncResult | null = null;

  // First, sync plans/products from providers
  if (!providerFilter || providerFilter === 'stripe') {
    planResult = await syncStripePlans();
  }

  // Then sync subscriptions
  if (!providerFilter || providerFilter === 'stripe') {
    stripeResult = await syncStripeSubscriptions();
  }

  if (!providerFilter || providerFilter === 'paypal') {
    paypalResult = await syncPayPalSubscriptions();
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SYNC SUMMARY');
  console.log('='.repeat(50));

  if (planResult) {
    console.log('\n📦 Plans:');
    console.log(`   Checked: ${planResult.checked}`);
    console.log(`   Created: ${planResult.created}`);
    console.log(`   Errors: ${planResult.errors}`);
  }

  if (stripeResult) {
    console.log('\n🔷 Stripe Subscriptions:');
    console.log(`   Checked: ${stripeResult.checked}`);
    console.log(`   Updated: ${stripeResult.updated}`);
    console.log(`   Created: ${stripeResult.created}`);
    console.log(`   Cancelled: ${stripeResult.cancelled}`);
    console.log(`   Errors: ${stripeResult.errors}`);
    console.log(`   Mismatches: ${stripeResult.mismatches.length}`);
  }

  if (paypalResult) {
    console.log('\n🔶 PayPal Subscriptions:');
    console.log(`   Checked: ${paypalResult.checked}`);
    console.log(`   Updated: ${paypalResult.updated}`);
    console.log(`   Created: ${paypalResult.created}`);
    console.log(`   Cancelled: ${paypalResult.cancelled}`);
    console.log(`   Errors: ${paypalResult.errors}`);
    console.log(`   Mismatches: ${paypalResult.mismatches.length}`);
  }

  // Print all mismatches
  const allMismatches = [
    ...(stripeResult?.mismatches || []),
    ...(paypalResult?.mismatches || []),
  ];

  if (allMismatches.length > 0) {
    console.log('\n📋 ALL SUBSCRIPTION MISMATCHES:');
    console.log('-'.repeat(50));
    for (const m of allMismatches) {
      console.log(`${m.email} (${m.provider}): ${m.ourStatus} → ${m.providerStatus} [${m.action}]`);
    }
  }

  if (isDryRun) {
    console.log('\n⚠️  This was a DRY RUN. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✅ Sync complete!');
  }
}

main().catch(console.error);

