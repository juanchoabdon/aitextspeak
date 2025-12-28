#!/usr/bin/env npx tsx
/**
 * PayPal Legacy Full Sync Script
 * 
 * Comprehensive sync that:
 * 1. Fetches all billing plans from PayPal Legacy
 * 2. Syncs all subscriptions (active, cancelled, suspended)
 * 3. Creates user profiles if they don't exist
 * 4. Creates subscription records with correct status
 * 
 * Usage:
 *   npx tsx scripts/sync-paypal-legacy.ts              # Full sync
 *   npx tsx scripts/sync-paypal-legacy.ts --dry-run    # Preview changes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Legacy PayPal account
const paypalLegacyClientId = process.env.PAYPAL_LEGACY_CLIENT_ID!;
const paypalLegacyClientSecret = process.env.PAYPAL_LEGACY_CLIENT_SECRET!;
const paypalMode = process.env.PAYPAL_MODE || 'live';

if (!paypalLegacyClientId || !paypalLegacyClientSecret) {
  console.error('❌ PAYPAL_LEGACY_CLIENT_ID and PAYPAL_LEGACY_CLIENT_SECRET are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const isDryRun = process.argv.includes('--dry-run');

const baseUrl = paypalMode === 'live' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

interface SyncStats {
  plansFound: number;
  plansSynced: number;
  subscriptionsChecked: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  suspendedSubscriptions: number;
  usersCreated: number;
  usersUpdatedToPro: number;
  usersAlreadyPro: number;
  subscriptionsCreated: number;
  subscriptionsUpdated: number;
  errors: number;
}

const stats: SyncStats = {
  plansFound: 0,
  plansSynced: 0,
  subscriptionsChecked: 0,
  activeSubscriptions: 0,
  cancelledSubscriptions: 0,
  suspendedSubscriptions: 0,
  usersCreated: 0,
  usersUpdatedToPro: 0,
  usersAlreadyPro: 0,
  subscriptionsCreated: 0,
  subscriptionsUpdated: 0,
  errors: 0,
};

async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${paypalLegacyClientId}:${paypalLegacyClientSecret}`).toString('base64');
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get PayPal access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

interface PayPalPlan {
  id: string;
  name: string;
  status: string;
  description?: string;
  billing_cycles?: Array<{
    tenure_type: string;
    sequence: number;
    total_cycles: number;
    pricing_scheme: {
      fixed_price: {
        value: string;
        currency_code: string;
      };
    };
    frequency: {
      interval_unit: string;
      interval_count: number;
    };
  }>;
  create_time?: string;
}

interface PayPalSubscription {
  id: string;
  status: string;
  plan_id?: string;
  subscriber?: {
    email_address?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
  billing_info?: {
    next_billing_time?: string;
    last_payment?: {
      amount?: {
        value?: string;
        currency_code?: string;
      };
      time?: string;
    };
    failed_payments_count?: number;
  };
  create_time?: string;
  update_time?: string;
  status_update_time?: string;
}

async function listBillingPlans(accessToken: string): Promise<PayPalPlan[]> {
  const plans: PayPalPlan[] = [];
  let page = 1;
  let hasMore = true;

  console.log('📋 Fetching billing plans from PayPal Legacy...');

  while (hasMore) {
    try {
      const response = await fetch(`${baseUrl}/v1/billing/plans?page_size=20&page=${page}&total_required=true`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Error fetching plans:`, error);
        break;
      }

      const data = await response.json();
      const pagePlans = data.plans || [];

      for (const plan of pagePlans) {
        // Get full plan details
        const detailResponse = await fetch(`${baseUrl}/v1/billing/plans/${plan.id}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (detailResponse.ok) {
          const fullPlan = await detailResponse.json();
          plans.push(fullPlan);
          console.log(`  Found plan: ${fullPlan.id} - ${fullPlan.name || 'Unnamed'} (${fullPlan.status})`);
        } else {
          plans.push(plan);
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      hasMore = pagePlans.length === 20;
      page++;
    } catch (error) {
      console.error('Error listing plans:', error);
      break;
    }
  }

  stats.plansFound = plans.length;
  return plans;
}

async function syncPlansToDatabase(plans: PayPalPlan[]): Promise<Map<string, string>> {
  console.log('\n💾 Syncing plans to database...');
  
  const planIdMap = new Map<string, string>(); // PayPal plan ID -> our plan ID
  
  for (const plan of plans) {
    // Extract pricing info
    let priceAmount = 9.99;
    let interval = 'month';
    let intervalCount = 1;
    
    if (plan.billing_cycles && plan.billing_cycles.length > 0) {
      const regularCycle = plan.billing_cycles.find(c => c.tenure_type === 'REGULAR');
      if (regularCycle) {
        priceAmount = parseFloat(regularCycle.pricing_scheme.fixed_price.value);
        interval = regularCycle.frequency.interval_unit.toLowerCase();
        intervalCount = regularCycle.frequency.interval_count;
      }
    }
    
    // Create a unique plan ID for our system
    const ourPlanId = `paypal_legacy_${plan.id}`;
    
    const planData = {
      id: ourPlanId,
      name: plan.name || `PayPal Legacy Plan`,
      description: plan.description || `Legacy PayPal subscription plan`,
      price_amount: Math.round(priceAmount * 100), // Store in cents
      price_currency: 'USD',
      billing_interval: interval,
      characters_per_month: -1, // Unlimited for legacy
      paypal_plan_id: plan.id,
      features: ['Legacy PayPal Plan', 'Unlimited Characters', 'All Voices'],
      is_active: plan.status === 'ACTIVE',
      is_legacy: true,
      is_discovered: true,
    };
    
    if (!isDryRun) {
      const { error } = await supabase
        .from('plans')
        .upsert(planData, { onConflict: 'id' });
      
      if (error) {
        console.error(`  ❌ Error syncing plan ${plan.id}: ${error.message}`);
        stats.errors++;
      } else {
        console.log(`  ✅ Synced plan: ${plan.name} ($${priceAmount}/${interval})`);
        stats.plansSynced++;
      }
    } else {
      console.log(`  [DRY RUN] Would sync plan: ${plan.name} ($${priceAmount}/${interval})`);
      stats.plansSynced++;
    }
    
    planIdMap.set(plan.id, ourPlanId);
  }
  
  return planIdMap;
}

async function getPayPalSubscription(accessToken: string, subscriptionId: string): Promise<PayPalSubscription | null> {
  try {
    const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      return null;
    }

    return await response.json();
  } catch (error) {
    return null;
  }
}

async function findOrCreateUser(email: string, fullName?: string): Promise<string | null> {
  // First try to find existing user
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', email.toLowerCase())
    .single();
  
  if (existingProfile) {
    return existingProfile.id;
  }
  
  // Try case-insensitive search
  const { data: ilikeProfiles } = await supabase
    .from('profiles')
    .select('id, email, role')
    .ilike('email', email);
  
  if (ilikeProfiles && ilikeProfiles.length > 0) {
    return ilikeProfiles[0].id;
  }
  
  // User doesn't exist - create them
  if (isDryRun) {
    console.log(`  [DRY RUN] Would create user: ${email}`);
    stats.usersCreated++;
    return `dry-run-${email}`;
  }
  
  // Create auth user via Supabase Admin API
  const nameParts = (fullName || email.split('@')[0]).split(' ');
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email.toLowerCase(),
    email_confirm: true,
    user_metadata: {
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      is_legacy_paypal: true,
    },
  });
  
  if (authError || !authUser.user) {
    console.error(`  ❌ Error creating auth user for ${email}: ${authError?.message}`);
    stats.errors++;
    return null;
  }
  
  // Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      email: email.toLowerCase(),
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      role: 'user',
      is_legacy_user: true,
    });
  
  if (profileError) {
    console.error(`  ❌ Error creating profile for ${email}: ${profileError.message}`);
    stats.errors++;
    return null;
  }
  
  console.log(`  ✅ Created new user: ${email}`);
  stats.usersCreated++;
  return authUser.user.id;
}

async function syncSubscription(
  sub: PayPalSubscription,
  userId: string,
  planIdMap: Map<string, string>
): Promise<void> {
  const ourPlanId = sub.plan_id ? planIdMap.get(sub.plan_id) : null;
  
  // Map PayPal status to our status
  let dbStatus: 'active' | 'canceled' | 'past_due' | 'incomplete' = 'active';
  if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') {
    dbStatus = 'canceled';
  } else if (sub.status === 'SUSPENDED') {
    dbStatus = 'past_due';
  } else if (sub.status === 'APPROVAL_PENDING') {
    dbStatus = 'incomplete';
  }
  
  // Get pricing info
  const lastPaymentAmount = sub.billing_info?.last_payment?.amount?.value 
    ? parseFloat(sub.billing_info.last_payment.amount.value)
    : 9.99;
  
  const subscriptionData = {
    user_id: userId,
    provider: 'paypal_legacy' as const,
    provider_subscription_id: sub.id,
    plan_id: ourPlanId,
    plan_name: ourPlanId ? `PayPal Legacy Plan` : 'Unknown Plan',
    status: dbStatus,
    price_amount: Math.round(lastPaymentAmount * 100),
    price_currency: sub.billing_info?.last_payment?.amount?.currency_code || 'USD',
    billing_interval: 'month',
    current_period_start: sub.create_time ? new Date(sub.create_time).toISOString() : new Date().toISOString(),
    current_period_end: sub.billing_info?.next_billing_time 
      ? new Date(sub.billing_info.next_billing_time).toISOString() 
      : null,
    canceled_at: dbStatus === 'canceled' && sub.status_update_time 
      ? new Date(sub.status_update_time).toISOString() 
      : null,
    auto_renew: sub.status === 'ACTIVE',
    is_legacy: true,
  };
  
  if (!isDryRun) {
    // Upsert subscription (creates if not exists, updates if exists)
    // Use provider + provider_subscription_id as unique key
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('provider_subscription_id', sub.id)
      .eq('provider', 'paypal_legacy')
      .single();
    
    if (existingSub) {
      // Update existing
      const { error } = await supabase
        .from('subscriptions')
        .update({
          ...subscriptionData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSub.id);
      
      if (error) {
        console.error(`  ❌ Error updating subscription: ${error.message}`);
        stats.errors++;
      } else {
        stats.subscriptionsUpdated++;
      }
    } else {
      // Create new - check user doesn't already have a paypal_legacy subscription
      const { data: userExistingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('provider', 'paypal_legacy')
        .single();
      
      if (userExistingSub) {
        // Update the existing one instead
        const { error } = await supabase
          .from('subscriptions')
          .update({
            ...subscriptionData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userExistingSub.id);
        
        if (error) {
          console.error(`  ❌ Error updating user subscription: ${error.message}`);
          stats.errors++;
        } else {
          stats.subscriptionsUpdated++;
        }
      } else {
        // Create new
        const { error } = await supabase
          .from('subscriptions')
          .insert(subscriptionData);
        
        if (error) {
          console.error(`  ❌ Error creating subscription: ${error.message}`);
          stats.errors++;
        } else {
          stats.subscriptionsCreated++;
        }
      }
    }
    
    // Update user role based on subscription status
    if (dbStatus === 'active') {
      await supabase
        .from('profiles')
        .update({ role: 'pro' })
        .eq('id', userId);
      stats.usersUpdatedToPro++;
    }
    
    // Note: We don't create payment_history records here anymore
    // The full transaction history is synced separately via sync-paypal-legacy-transactions.ts
  } else {
    console.log(`  [DRY RUN] Would sync subscription ${sub.id} (${dbStatus})`);
    stats.subscriptionsCreated++;
    if (dbStatus === 'active') {
      stats.usersUpdatedToPro++;
    }
  }
}

async function syncLegacyPayPal(): Promise<void> {
  console.log('='.repeat(60));
  console.log('PayPal Legacy Full Sync');
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log(`PayPal Mode: ${paypalMode}`);
  console.log('='.repeat(60));
  console.log('');

  // Get access token
  console.log('🔑 Getting PayPal access token...');
  const accessToken = await getPayPalAccessToken();
  console.log('✅ Access token obtained\n');

  // Step 1: Get and sync billing plans
  const plans = await listBillingPlans(accessToken);
  const planIdMap = await syncPlansToDatabase(plans);
  
  // Step 2: Get all subscription IDs from our payment_history
  console.log('\n📊 Getting subscription IDs from payment history...');
  const { data: paymentHistory } = await supabase
    .from('payment_history')
    .select('gateway_identifier')
    .in('gateway', ['paypal', 'paypal_legacy'])
    .not('gateway_identifier', 'is', null);

  const subscriptionIds = new Set<string>();
  if (paymentHistory) {
    for (const ph of paymentHistory) {
      if (ph.gateway_identifier?.startsWith('I-')) {
        subscriptionIds.add(ph.gateway_identifier);
      }
    }
  }
  
  console.log(`Found ${subscriptionIds.size} unique subscription IDs\n`);

  // Step 3: Check each subscription and sync
  console.log('🔄 Syncing subscriptions...\n');
  
  let processed = 0;
  for (const subscriptionId of subscriptionIds) {
    processed++;
    stats.subscriptionsChecked++;
    
    const sub = await getPayPalSubscription(accessToken, subscriptionId);
    
    if (!sub) {
      process.stdout.write(`\r  [${processed}/${subscriptionIds.size}] ${subscriptionId} - not found in PayPal`);
      continue;
    }
    
    const email = sub.subscriber?.email_address?.toLowerCase();
    if (!email) {
      process.stdout.write(`\r  [${processed}/${subscriptionIds.size}] ${subscriptionId} - no email`);
      continue;
    }
    
    // Track status
    if (sub.status === 'ACTIVE') {
      stats.activeSubscriptions++;
    } else if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') {
      stats.cancelledSubscriptions++;
    } else if (sub.status === 'SUSPENDED') {
      stats.suspendedSubscriptions++;
    }
    
    const fullName = sub.subscriber?.name 
      ? `${sub.subscriber.name.given_name || ''} ${sub.subscriber.name.surname || ''}`.trim()
      : undefined;
    
    // Find or create user
    const userId = await findOrCreateUser(email, fullName);
    if (!userId) {
      console.log(`\n  ❌ ${email} - Could not find or create user`);
      continue;
    }
    
    // Sync the subscription
    await syncSubscription(sub, userId, planIdMap);
    
    const statusEmoji = sub.status === 'ACTIVE' ? '✅' : sub.status === 'SUSPENDED' ? '⚠️' : '❌';
    console.log(`\n  ${statusEmoji} ${email} - ${sub.status} (${subscriptionId})`);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('SYNC SUMMARY');
  console.log('='.repeat(60));
  console.log(`Plans found in PayPal: ${stats.plansFound}`);
  console.log(`Plans synced to DB: ${stats.plansSynced}`);
  console.log('');
  console.log(`Subscriptions checked: ${stats.subscriptionsChecked}`);
  console.log(`  - Active: ${stats.activeSubscriptions}`);
  console.log(`  - Cancelled: ${stats.cancelledSubscriptions}`);
  console.log(`  - Suspended (past_due): ${stats.suspendedSubscriptions}`);
  console.log('');
  console.log(`Users created: ${stats.usersCreated}`);
  console.log(`Users updated to PRO: ${stats.usersUpdatedToPro}`);
  console.log(`Subscriptions created: ${stats.subscriptionsCreated}`);
  console.log(`Subscriptions updated: ${stats.subscriptionsUpdated}`);
  console.log(`Errors: ${stats.errors}`);
  console.log('');
  
  if (isDryRun) {
    console.log('⚠️  DRY RUN - No changes were made');
  } else {
    console.log('✅ Sync complete!');
  }
}

// Run the sync
syncLegacyPayPal().catch(console.error);
