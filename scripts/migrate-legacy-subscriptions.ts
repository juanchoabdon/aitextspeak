/**
 * Legacy Subscriptions Migration Script
 * 
 * This script migrates subscriptions from the legacy MySQL database to Supabase.
 * 
 * PREREQUISITES:
 * 1. Export your legacy MySQL subscriptions table to a JSON file
 * 2. Ensure all legacy users have been migrated (legacy_users table populated)
 * 
 * USAGE:
 * 1. Export MySQL data and save as: scripts/data/legacy_subscriptions.json
 * 2. Run: npx tsx scripts/migrate-legacy-subscriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Read .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

interface LegacySubscription {
  id: number;
  ids: string;
  item_ids: string;
  user_ids: string;
  payment_gateway: string;
  gateway_identifier: string;
  gateway_auth_code: string;
  quantity: number;
  status: string;
  start_time: string | null;
  end_time: string | null;
  created_time: string | null;
  updated_time: string | null;
  description: string;
  stuff: string;
  used_up: number;
  auto_renew: number;
  stuff_voicelab: string | null;
}

// Map legacy payment gateway to new provider
function mapProvider(gateway: string): 'stripe' | 'paypal' | 'paypal_legacy' {
  const g = gateway.toLowerCase();
  if (g.includes('stripe')) return 'stripe';
  if (g.includes('paypal')) return 'paypal_legacy'; // Legacy PayPal
  return 'stripe'; // Default
}

// Map legacy status to new status
function mapStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'completed') return 'active';
  if (s === 'cancelled' || s === 'canceled') return 'canceled';
  if (s === 'past_due' || s === 'overdue') return 'past_due';
  if (s === 'lifetime' || s === 'one-time') return 'lifetime';
  if (s === 'trialing' || s === 'trial') return 'trialing';
  if (s === 'paused') return 'paused';
  return 'active'; // Default to active
}

// Determine plan_id from item_name or stuff JSON
function determinePlanId(itemName: string | null, stuff: Record<string, unknown> | null): { planId: string; planName: string } {
  const name = (itemName || '').toLowerCase();
  const stripePriceId = stuff?.stripe_price_id as string | undefined;
  
  // Check by name first
  if (name.includes('lifetime') || name.includes('one-time') || name.includes('onetime')) {
    return { planId: 'lifetime', planName: 'Lifetime' };
  }
  if (name.includes('pro') || name.includes('unlimited')) {
    return { planId: 'monthly_pro', planName: 'Monthly Pro' };
  }
  if (name.includes('basic') || name.includes('monthly') || name.includes('month')) {
    return { planId: 'monthly', planName: 'Basic Plan' };
  }
  if (name.includes('free')) {
    return { planId: 'free', planName: 'Free' };
  }
  
  // Check by Stripe price ID
  if (stripePriceId) {
    // Basic Plan price IDs (current and legacy)
    if (stripePriceId.includes('Qw4L1') || stripePriceId.includes('KNQX5')) {
      return { planId: 'monthly', planName: 'Basic Plan' };
    }
    // Pro Plan price IDs
    if (stripePriceId.includes('pro') || stripePriceId.includes('Pro')) {
      return { planId: 'monthly_pro', planName: 'Monthly Pro' };
    }
    // Lifetime price IDs
    if (stripePriceId.includes('SZPRH') || stripePriceId.includes('lifetime')) {
      return { planId: 'lifetime', planName: 'Lifetime' };
    }
  }
  
  // Default to monthly if we can't determine
  return { planId: 'monthly', planName: 'Basic Plan' };
}

// Parse stuff/legacy_data JSON
function parseStuff(stuff: string): Record<string, unknown> | null {
  if (!stuff) return null;
  try {
    return JSON.parse(stuff);
  } catch {
    return { raw: stuff };
  }
}

interface LegacyUserResult {
  supabase_user_id: string | null;
  legacy_id: number;
  email: string;
}

async function getUserFromLegacyId(legacyUserIds: string): Promise<LegacyUserResult | null> {
  const legacyId = legacyUserIds.split(',')[0].trim();
  
  // First try by numeric legacy_id
  const { data, error } = await supabase
    .from('legacy_users')
    .select('supabase_user_id, legacy_id, email')
    .eq('legacy_id', parseInt(legacyId))
    .single();
  
  if (!error && data) {
    return data as LegacyUserResult;
  }
  
  // Try matching by 'legacy_ids' field (the string identifier)
  const { data: dataByIds } = await supabase
    .from('legacy_users')
    .select('supabase_user_id, legacy_id, email')
    .eq('legacy_ids', legacyUserIds)
    .single();
  
  return dataByIds as LegacyUserResult | null;
}

async function migrateSubscriptions() {
  const dataPath = resolve(process.cwd(), 'scripts/data/legacy_subscriptions.json');
  
  if (!existsSync(dataPath)) {
    console.log('❌ No legacy subscriptions file found!');
    console.log('');
    console.log('Please export your legacy subscriptions from MySQL and save to:');
    console.log(`  ${dataPath}`);
    console.log('');
    console.log('Expected JSON format:');
    console.log('[');
    console.log('  {');
    console.log('    "id": 1,');
    console.log('    "ids": "abc123",');
    console.log('    "user_ids": "5",');
    console.log('    "payment_gateway": "stripe",');
    console.log('    "gateway_identifier": "sub_xxx",');
    console.log('    "status": "active",');
    console.log('    "end_time": "2025-01-15 00:00:00",');
    console.log('    ...');
    console.log('  }');
    console.log(']');
    return;
  }

  console.log('💳 Starting legacy subscriptions migration...\n');

  const rawData = readFileSync(dataPath, 'utf-8');
  const legacySubs: LegacySubscription[] = JSON.parse(rawData);

  console.log(`📦 Found ${legacySubs.length} subscriptions to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const sub of legacySubs) {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('legacy_id', sub.id)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping subscription #${sub.id} - already migrated`);
      skipped++;
      continue;
    }

    // Find the legacy user
    const legacyUser = await getUserFromLegacyId(sub.user_ids);

    if (!legacyUser) {
      console.log(`⚠️  Skipping subscription #${sub.id} - user not found in legacy_users (user_ids: ${sub.user_ids})`);
      failed++;
      continue;
    }

    const userId = legacyUser.supabase_user_id;
    
    if (!userId) {
      console.log(`⚠️  User ${legacyUser.email} (legacy_id: ${legacyUser.legacy_id}) hasn't logged in yet.`);
      console.log(`   Subscription will be imported but needs linking after user logs in.`);
    }

    // Determine the status
    const status = mapStatus(sub.status);
    
    // Check if subscription is actually active (end_time in the future)
    let effectiveStatus = status;
    if (sub.end_time) {
      const endDate = new Date(sub.end_time);
      if (endDate < new Date() && status === 'active') {
        effectiveStatus = 'canceled'; // Expired
      }
    }

    // Build legacy data object
    const stuffData = parseStuff(sub.stuff);
    const legacyData = {
      stuff: stuffData,
      stuff_voicelab: sub.stuff_voicelab ? parseStuff(sub.stuff_voicelab) : null,
      gateway_auth_code: sub.gateway_auth_code,
      original_status: sub.status,
    };

    // Determine plan from item name or stuff JSON
    const { planId, planName } = determinePlanId(sub.description, stuffData);

    // Insert the subscription
    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      legacy_id: sub.id,
      legacy_ids: sub.ids,
      legacy_item_ids: sub.item_ids,
      legacy_user_ids: sub.user_ids,
      provider: mapProvider(sub.payment_gateway),
      provider_subscription_id: sub.gateway_identifier || `legacy_${sub.id}`,
      status: effectiveStatus,
      plan_id: planId,
      plan_name: planName,
      quantity: sub.quantity || 1,
      description: sub.description || null,
      auto_renew: sub.auto_renew === 1,
      used_up: sub.used_up === 1,
      current_period_start: sub.start_time || null,
      current_period_end: sub.end_time || null,
      is_legacy: true,
      legacy_data: legacyData,
      created_at: sub.created_time || new Date().toISOString(),
    });

    if (error) {
      console.log(`❌ Failed to migrate subscription #${sub.id}: ${error.message}`);
      failed++;
    } else {
      const statusEmoji = effectiveStatus === 'active' ? '🟢' : effectiveStatus === 'lifetime' ? '⭐' : '🔴';
      console.log(`✅ Migrated subscription #${sub.id}: ${statusEmoji} ${effectiveStatus} - ${planName} (${sub.payment_gateway})`);
      migrated++;
    }
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log('========================================\n');
}

migrateSubscriptions().catch(console.error);



