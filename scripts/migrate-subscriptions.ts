/**
 * Legacy Subscriptions Migration Script
 * 
 * Maps legacy subscriptions to new Supabase subscriptions table
 * 
 * Run with: npx tsx scripts/migrate-subscriptions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
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

const isDryRun = process.argv.includes('--dry-run');

interface LegacySubscription {
  id: string;
  ids: string;
  item_ids: string;
  user_ids: string;
  payment_gateway: string;
  gateway_identifier: string;
  gateway_auth_code: string;
  quantity: string;
  status: string;
  start_time: string;
  end_time: string;
  created_time: string;
  updated_time: string;
  description: string;
  stuff: string;
  used_up: string;
  auto_renew: string;
  stuff_voicelab: string | null;
}

// Map legacy status to new status
function mapStatus(legacyStatus: string): string {
  switch (legacyStatus) {
    case 'active':
      return 'active';
    case 'suspended':
      return 'canceled';
    case 'pending_cancellation':
      return 'canceled';
    case 'expired':
      return 'canceled';
    default:
      return 'canceled';
  }
}

// Map payment gateway to provider
function mapProvider(gateway: string): string {
  if (gateway === 'paypal') {
    return 'paypal_legacy';
  }
  return 'stripe';
}

// Parse the stuff JSON to extract plan info
function parseStuff(stuffStr: string): any {
  if (!stuffStr || stuffStr === '') return {};
  try {
    return JSON.parse(stuffStr);
  } catch {
    return {};
  }
}

// Determine plan name from item_ids or stuff
function determinePlanName(sub: LegacySubscription): string {
  const stuff = parseStuff(sub.stuff);
  
  // Check characters limit to determine plan
  const charLimit = parseInt(stuff.characters_limit || '0');
  
  if (charLimit >= 30000000 || charLimit >= 24000000) {
    return 'Pro Annual';
  } else if (charLimit >= 5000000) {
    return 'Pro Monthly';
  } else if (charLimit >= 4000000) {
    return 'Basic Monthly';
  }
  
  // Default based on item_ids
  if (sub.item_ids.includes('JalWMnzxId')) {
    return 'Pro Annual';
  }
  
  return 'Basic Monthly';
}

async function loadLegacyUserMap(): Promise<Map<string, string>> {
  console.log('📋 Loading legacy users mapping...');
  
  const map = new Map<string, string>();
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data: legacyUsers, error } = await supabase
      .from('legacy_users')
      .select('legacy_ids, supabase_user_id')
      .not('supabase_user_id', 'is', null)
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Error loading legacy users:', error);
      break;
    }
    
    if (!legacyUsers || legacyUsers.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const user of legacyUsers) {
      if (user.legacy_ids && user.supabase_user_id) {
        map.set(user.legacy_ids, user.supabase_user_id);
      }
    }
    
    offset += pageSize;
    
    if (legacyUsers.length < pageSize) {
      hasMore = false;
    }
  }
  
  console.log(`   Found ${map.size} legacy users with Supabase IDs\n`);
  return map;
}

async function getExistingSubscriptions(): Promise<Set<number>> {
  console.log('📋 Loading existing subscriptions...');
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('legacy_id')
    .not('legacy_id', 'is', null);
  
  if (error) {
    console.error('Error loading subscriptions:', error);
    return new Set();
  }
  
  const set = new Set<number>();
  for (const sub of data || []) {
    if (sub.legacy_id) {
      set.add(sub.legacy_id);
    }
  }
  
  console.log(`   Found ${set.size} already migrated subscriptions\n`);
  return set;
}

async function migrateSubscriptions() {
  console.log('🚀 Starting subscriptions migration...');
  if (isDryRun) {
    console.log('   (DRY RUN - no changes will be made)\n');
  }

  const dataPath = path.join(process.cwd(), 'scripts/data/legacy_subscriptions.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const legacySubscriptions: LegacySubscription[] = JSON.parse(rawData);

  console.log(`📦 Found ${legacySubscriptions.length} subscriptions in JSON file\n`);

  // Load mappings
  const legacyUserMap = await loadLegacyUserMap();
  const existingSubscriptions = await getExistingSubscriptions();

  let created = 0;
  let skipped = 0;
  let failed = 0;
  let userNotFound = 0;
  const errors: { id: string; error: string }[] = [];

  for (const sub of legacySubscriptions) {
    const legacyId = parseInt(sub.id);
    
    // Skip if already migrated
    if (existingSubscriptions.has(legacyId)) {
      skipped++;
      continue;
    }

    // Find the Supabase user ID
    const supabaseUserId = legacyUserMap.get(sub.user_ids);
    
    if (!supabaseUserId) {
      userNotFound++;
      continue;
    }

    if (isDryRun) {
      created++;
      console.log(`Would create: ID ${sub.id} for user ${supabaseUserId}`);
      continue;
    }

    const stuff = parseStuff(sub.stuff);
    const planName = determinePlanName(sub);

    const subscriptionData = {
      user_id: supabaseUserId,
      provider: mapProvider(sub.payment_gateway),
      provider_subscription_id: sub.gateway_identifier,
      status: mapStatus(sub.status),
      plan_name: planName,
      current_period_start: sub.start_time ? new Date(sub.start_time).toISOString() : null,
      current_period_end: sub.end_time ? new Date(sub.end_time).toISOString() : null,
      is_legacy: true,
      legacy_id: legacyId,
      legacy_ids: sub.ids,
      legacy_item_ids: sub.item_ids,
      legacy_user_ids: sub.user_ids,
      quantity: parseInt(sub.quantity) || 1,
      description: sub.description || null,
      auto_renew: sub.auto_renew === '1',
      used_up: sub.used_up === '1',
      legacy_data: {
        ...stuff,
        gateway_auth_code: sub.gateway_auth_code,
        created_time: sub.created_time,
        updated_time: sub.updated_time,
        stuff_voicelab: sub.stuff_voicelab,
      },
      created_at: sub.created_time ? new Date(sub.created_time).toISOString() : new Date().toISOString(),
    };

    const { error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (error) {
      failed++;
      errors.push({ id: sub.id, error: error.message });
      if (errors.length <= 10) {
        console.log(`❌ Failed ID ${sub.id}: ${error.message}`);
      }
    } else {
      created++;
      console.log(`✅ Created: ID ${sub.id} - ${planName} (${sub.status})`);
    }
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Created:        ${created}`);
  console.log(`   ⏭️  Skipped:        ${skipped} (already migrated)`);
  console.log(`   👤 User not found: ${userNotFound}`);
  console.log(`   ❌ Failed:         ${failed}`);
  console.log('========================================\n');

  if (errors.length > 0) {
    console.log('First 10 errors:');
    errors.slice(0, 10).forEach(e => console.log(`   ID ${e.id}: ${e.error}`));
  }
}

migrateSubscriptions().catch(console.error);






