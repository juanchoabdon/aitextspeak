/**
 * Migrate Legacy Payment Log to payment_history table
 * 
 * Run with: npx tsx scripts/migrate-payment-history.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegacyPayment {
  id: string;
  ids: string;
  user_ids: string;
  type: string;
  gateway: string;
  currency: string;
  price: string;
  quantity: string;
  amount: string;
  gateway_identifier: string;
  gateway_event_id: string;
  item_ids: string;
  item_name: string;
  redirect_status: string;
  callback_status: string;
  created_time: string;
  callback_time: string | null;
  visible_for_user: string;
  generate_invoice: string;
  description: string;
  stuff: string;
  coupon: string;
  coupon_discount: string;
  tax: string;
}

const BATCH_SIZE = 100;

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

async function getExistingPayments(): Promise<Set<number>> {
  console.log('📋 Loading existing migrated payments...');
  const existingIds = new Set<number>();
  
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('payment_history')
      .select('legacy_id')
      .not('legacy_id', 'is', null)
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Error loading existing payments:', error);
      break;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const payment of data) {
      if (payment.legacy_id) {
        existingIds.add(payment.legacy_id);
      }
    }
    
    offset += pageSize;
    if (data.length < pageSize) {
      hasMore = false;
    }
  }
  
  console.log(`   Found ${existingIds.size} already migrated payments\n`);
  return existingIds;
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === '0000-00-00 00:00:00' || dateStr === 'null') {
    return null;
  }
  try {
    const date = new Date(dateStr.replace(' ', 'T') + 'Z');
    return date.toISOString();
  } catch {
    return null;
  }
}

function parseMetadata(stuff: string): Record<string, unknown> | null {
  if (!stuff) return null;
  try {
    return JSON.parse(stuff);
  } catch {
    return null;
  }
}

async function migratePayments() {
  console.log('🚀 Starting Payment History Migration\n');
  console.log('='.repeat(50));
  
  // Load legacy payments
  const paymentsPath = path.join(process.cwd(), 'scripts/data/legacy_payment_log.json');
  const paymentsData = fs.readFileSync(paymentsPath, 'utf-8');
  const legacyPayments: LegacyPayment[] = JSON.parse(paymentsData);
  
  console.log(`📦 Found ${legacyPayments.length} legacy payments to process\n`);
  
  // Load user mapping
  const userMap = await loadLegacyUserMap();
  
  // Get already migrated payments
  const existingPayments = await getExistingPayments();
  
  // Filter out already migrated
  const toMigrate = legacyPayments.filter(p => !existingPayments.has(Number(p.id)));
  console.log(`📋 ${toMigrate.length} payments to migrate (${existingPayments.size} already done)\n`);
  
  if (toMigrate.length === 0) {
    console.log('✅ All payments already migrated!');
    return;
  }
  
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  
  // Process in batches
  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE);
    const records = [];
    
    for (const payment of batch) {
      const supabaseUserId = userMap.get(payment.user_ids);
      
      if (!supabaseUserId) {
        skipped++;
        continue;
      }
      
      records.push({
        user_id: supabaseUserId,
        legacy_id: Number(payment.id),
        legacy_ids: payment.ids,
        legacy_user_ids: payment.user_ids,
        transaction_type: payment.type || 'subscription',
        gateway: payment.gateway,
        gateway_identifier: payment.gateway_identifier || null,
        gateway_event_id: payment.gateway_event_id || null,
        currency: payment.currency || 'USD',
        price: parseFloat(payment.price) || 0,
        quantity: parseInt(payment.quantity) || 1,
        amount: parseFloat(payment.amount) || 0,
        item_ids: payment.item_ids || null,
        item_name: payment.item_name || null,
        redirect_status: payment.redirect_status || null,
        callback_status: payment.callback_status || null,
        visible_for_user: payment.visible_for_user === '1',
        generate_invoice: payment.generate_invoice === '1',
        coupon: payment.coupon || null,
        coupon_discount: parseFloat(payment.coupon_discount) || 0,
        tax: parseFloat(payment.tax) || 0,
        description: payment.description || null,
        metadata: parseMetadata(payment.stuff),
        created_at: parseDate(payment.created_time),
        callback_at: parseDate(payment.callback_time),
        is_legacy: true,
      });
    }
    
    if (records.length > 0) {
      const { error } = await supabase
        .from('payment_history')
        .insert(records);
      
      if (error) {
        console.error(`❌ Batch error:`, error.message);
        failed += records.length;
      } else {
        migrated += records.length;
      }
    }
    
    // Progress update
    const progress = Math.min(i + BATCH_SIZE, toMigrate.length);
    const percent = Math.round((progress / toMigrate.length) * 100);
    process.stdout.write(`\r⏳ Progress: ${progress}/${toMigrate.length} (${percent}%) - Migrated: ${migrated}, Skipped: ${skipped}, Failed: ${failed}`);
  }
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⚠️  Skipped (no user): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

migratePayments().catch(console.error);
