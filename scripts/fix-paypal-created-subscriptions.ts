#!/usr/bin/env node
/**
 * Fix PayPal subscriptions that received CREATED event but were never activated
 * 
 * This script:
 * 1. Finds PayPal subscriptions in 'pending' status or created recently
 * 2. Fetches their current status from PayPal API
 * 3. Updates them to 'active' if they're actually active in PayPal
 * 4. Updates user roles and creates payment_history if needed
 * 
 * Usage:
 *   # Check pending subscriptions only
 *   npx tsx scripts/fix-paypal-created-subscriptions.ts
 *   
 *   # Dry run (no changes)
 *   npx tsx scripts/fix-paypal-created-subscriptions.ts --dry-run
 *   
 *   # Check specific status
 *   npx tsx scripts/fix-paypal-created-subscriptions.ts --status=pending
 *   
 *   # Check all PayPal subscriptions from last 30 days (recommended)
 *   npx tsx scripts/fix-paypal-created-subscriptions.ts --check-all
 *   
 *   # Check all with dry run first
 *   npx tsx scripts/fix-paypal-created-subscriptions.ts --check-all --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

// PayPal API functions (copied from src/lib/payments/paypal.ts)
const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

interface PayPalSubscriptionDetails {
  id: string;
  plan_id: string;
  status?: string;
  start_time?: string;
  billing_info?: {
    next_billing_time?: string;
  };
  subscriber?: {
    payer_id?: string;
  };
}

async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscriptionDetails | null> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting PayPal subscription:', error);
    return null;
  }
}

// Simple plan mapping (you can expand this if needed)
function getPlanByPayPalPlanId(planId: string): { id: string; name: string; price: number } | null {
  const monthlyPlanId = process.env.PAYPAL_PLAN_MONTHLY;
  const monthlyProPlanId = process.env.PAYPAL_PLAN_MONTHLY_PRO;

  if (planId === monthlyPlanId) {
    return { id: 'monthly', name: 'Basic Plan', price: 9.99 };
  }
  if (planId === monthlyProPlanId) {
    return { id: 'monthly_pro', name: 'Monthly Pro', price: 29.99 };
  }

  // Default fallback
  return { id: 'monthly', name: 'Monthly', price: 9.99 };
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Subscription {
  id: string;
  user_id: string;
  provider_subscription_id: string;
  status: string;
  plan_id: string | null;
  plan_name: string | null;
  price_amount: number | null;
  created_at: string;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const statusFilter = args.find(arg => arg.startsWith('--status='))?.split('=')[1];
  const checkAll = args.includes('--check-all');

  console.log('🔍 Finding PayPal subscriptions to fix...\n');

  let subscriptions: Subscription[] = [];
  let error;

  if (checkAll) {
    // Check ALL PayPal subscriptions (not just recent ones)
    // This will find any subscription that might need fixing
    console.log(`   Filter: ALL PayPal subscriptions`);
    console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}\n`);

    // Get all PayPal subscriptions
    const { data: allSubs, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, user_id, provider_subscription_id, status, plan_id, plan_name, price_amount, created_at')
      .eq('provider', 'paypal')
      .order('created_at', { ascending: false });

    subscriptions = allSubs || [];
    error = fetchError;
    
    if (subscriptions.length === 0) {
      console.log('ℹ️  No PayPal subscriptions found in database.');
      console.log('   This could mean:');
      console.log('   1. No PayPal subscriptions have been created yet');
      console.log('   2. Previous CREATED webhooks failed due to invalid status');
      console.log('   3. Subscriptions exist but with different provider name\n');
      console.log('✅ The webhook handler has been fixed to use "incomplete" status.');
      console.log('   Future CREATED webhooks should work correctly.\n');
      return;
    }
  } else {
    // Find PayPal subscriptions with specific status
    // Valid statuses: active, canceled, past_due, unpaid, trialing, paused, incomplete, incomplete_expired
    const filterStatus = statusFilter || 'incomplete';
    console.log(`   Filter: status = '${filterStatus}'`);
    console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}\n`);

    const { data, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, user_id, provider_subscription_id, status, plan_id, plan_name, price_amount, created_at')
      .eq('provider', 'paypal')
      .eq('status', filterStatus)
      .order('created_at', { ascending: false });

    subscriptions = data || [];
    error = fetchError;
  }

  if (error) {
    console.error('❌ Error fetching subscriptions:', error);
    process.exit(1);
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('✅ No subscriptions found with status:', statusFilter);
    return;
  }

  console.log(`📋 Found ${subscriptions.length} subscription(s) to check\n`);

  let fixed = 0;
  let alreadyCorrect = 0;
  let errors = 0;

  for (const sub of subscriptions) {
    console.log(`\n🔍 Checking subscription: ${sub.provider_subscription_id}`);
    console.log(`   User ID: ${sub.user_id}`);
    console.log(`   Current status: ${sub.status}`);
    console.log(`   Plan: ${sub.plan_name || sub.plan_id || 'unknown'}`);

    // Check user's current role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', sub.user_id)
      .single();

    const userRole = profile?.role || 'user';
    console.log(`   User role: ${userRole}`);

    try {
      // Fetch current status from PayPal
      const paypalSub = await getPayPalSubscription(sub.provider_subscription_id);

      if (!paypalSub) {
        console.log(`   ⚠️  Subscription not found in PayPal (may be cancelled/deleted)`);
        errors++;
        continue;
      }

      const paypalStatus = (paypalSub as any).status || 'UNKNOWN';
      console.log(`   PayPal status: ${paypalStatus}`);

      // Check if subscription is actually active in PayPal
      if (paypalStatus === 'ACTIVE') {
        const needsActivation = sub.status !== 'active' || userRole !== 'pro';
        
        if (needsActivation) {
          console.log(`   ✅ Subscription is ACTIVE in PayPal, needs to be activated`);
        } else {
          console.log(`   ℹ️  Subscription is already active and user role is correct`);
          alreadyCorrect++;
          continue;
        }

        if (!isDryRun) {
          // Get plan details
          const planId = (paypalSub as any).plan_id;
          const plan = planId ? getPlanByPayPalPlanId(planId) : null;

          // Update subscription to active
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: (paypalSub as any).start_time || null,
              current_period_end: paypalSub.billing_info?.next_billing_time || null,
              provider_customer_id: paypalSub.subscriber?.payer_id || null,
              plan_id: plan?.id || sub.plan_id || 'monthly',
              plan_name: plan?.name || sub.plan_name || 'Monthly',
              price_amount: plan?.price || sub.price_amount || 0,
            })
            .eq('id', sub.id);

          if (updateError) {
            console.error(`   ❌ Error updating subscription:`, updateError);
            errors++;
            continue;
          }

          // Check if payment_history already exists
          const { data: existingPayment } = await supabase
            .from('payment_history')
            .select('id')
            .eq('user_id', sub.user_id)
            .eq('gateway', 'paypal')
            .eq('gateway_identifier', sub.provider_subscription_id)
            .eq('transaction_type', 'subscription')
            .single();

          if (!existingPayment) {
            // Create payment_history entry
            const { error: paymentError } = await supabase
              .from('payment_history')
              .insert({
                user_id: sub.user_id,
                transaction_type: 'subscription',
                gateway: 'paypal',
                gateway_identifier: sub.provider_subscription_id,
                currency: 'USD',
                amount: plan?.price || sub.price_amount || 0,
                item_name: plan?.name || sub.plan_name || 'Subscription',
                redirect_status: 'success',
                callback_status: 'success',
                visible_for_user: true,
                metadata: {
                  plan_id: plan?.id || sub.plan_id,
                  paypal_plan_id: planId,
                  payer_id: paypalSub.subscriber?.payer_id,
                  fixed_by_script: true,
                },
              });

            if (paymentError) {
              console.error(`   ⚠️  Error creating payment_history:`, paymentError);
            } else {
              console.log(`   ✅ Created payment_history entry`);
            }
          } else {
            console.log(`   ℹ️  Payment_history already exists`);
          }

          // Update user role to pro
          const { error: roleError } = await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', sub.user_id);

          if (roleError) {
            console.error(`   ⚠️  Error updating user role:`, roleError);
          } else {
            console.log(`   ✅ Updated user role to 'pro'`);
          }

          fixed++;
          console.log(`   ✅ Subscription fixed!`);
        } else {
          console.log(`   [DRY RUN] Would update subscription to active`);
          fixed++;
        }
      } else if (paypalStatus === 'CANCELLED' || paypalStatus === 'SUSPENDED' || paypalStatus === 'EXPIRED') {
        console.log(`   ℹ️  Subscription is ${paypalStatus} in PayPal, updating status`);
        
        if (!isDryRun) {
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          if (updateError) {
            console.error(`   ❌ Error updating subscription:`, updateError);
            errors++;
          } else {
            console.log(`   ✅ Updated subscription status to canceled`);
            fixed++;
          }
        }
      } else {
        console.log(`   ℹ️  Subscription status in PayPal: ${paypalStatus} (no action needed)`);
        alreadyCorrect++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing subscription:`, error);
      errors++;
    }
  }

  console.log(`\n\n📊 Summary:`);
  console.log(`   ✅ Fixed: ${fixed}`);
  console.log(`   ℹ️  Already correct: ${alreadyCorrect}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📋 Total checked: ${subscriptions.length}`);

  if (isDryRun) {
    console.log(`\n⚠️  This was a DRY RUN. No changes were made.`);
    console.log(`   Run without --dry-run to apply changes.`);
  }
}

main().catch(console.error);

