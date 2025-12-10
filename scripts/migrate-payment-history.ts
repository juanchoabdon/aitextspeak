/**
 * Script to migrate payment history from ait_payment_log
 * 
 * Run with: npx tsx scripts/migrate-payment-history.ts
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

interface LegacyPaymentLog {
  id: number;
  ids: string;
  user_ids: string;
  type: string;
  gateway: string;
  currency: string;
  price: string | number;
  quantity: number;
  amount: string | number;
  gateway_identifier: string;
  gateway_event_id: string;
  item_ids: string;
  item_name: string;
  redirect_status: string;
  callback_status: string;
  created_time: string;
  callback_time: string | null;
  visible_for_user: string | number;
  generate_invoice: string | number;
  description: string | null;
  stuff: string | null;
  coupon: string | null;
  coupon_discount: string | number;
  tax: string | number;
}

async function getUserIdFromLegacyIds(legacyUserIds: string): Promise<string | null> {
  const { data } = await supabase
    .from('legacy_users')
    .select('supabase_user_id')
    .eq('legacy_ids', legacyUserIds)
    .single();
  
  return data?.supabase_user_id || null;
}

function parseStuff(stuff: string | null): Record<string, unknown> | null {
  if (!stuff) return null;
  try {
    return JSON.parse(stuff);
  } catch {
    return { raw: stuff };
  }
}

async function migratePaymentHistory() {
  console.log('💳 Starting payment history migration...\n');

  const dataPath = path.join(process.cwd(), 'scripts/data/legacy_payment_log.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    console.log('\nTo migrate payment history:');
    console.log('1. Export ait_payment_log from MySQL to JSON');
    console.log('2. Save it as scripts/data/legacy_payment_log.json');
    console.log('\nSQL:');
    console.log('  SELECT * FROM ait_payment_log');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const payments: LegacyPaymentLog[] = JSON.parse(rawData);

  console.log(`📦 Found ${payments.length} payment records to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const payment of payments) {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('payment_history')
      .select('id')
      .eq('legacy_id', payment.id)
      .single();

    if (existing) {
      skipped++;
      continue;
    }

    // Find user
    const userId = await getUserIdFromLegacyIds(payment.user_ids);

    // Insert payment record (user_id can be null for unmigrated users)
    const { error } = await supabase.from('payment_history').insert({
      user_id: userId,
      legacy_id: payment.id,
      legacy_ids: payment.ids,
      legacy_user_ids: payment.user_ids,
      transaction_type: payment.type || 'unknown',
      gateway: payment.gateway || 'unknown',
      gateway_identifier: payment.gateway_identifier,
      gateway_event_id: payment.gateway_event_id,
      currency: payment.currency || 'USD',
      price: parseFloat(String(payment.price)) || 0,
      quantity: payment.quantity || 1,
      amount: parseFloat(String(payment.amount)) || 0,
      item_ids: payment.item_ids,
      item_name: payment.item_name,
      redirect_status: payment.redirect_status,
      callback_status: payment.callback_status,
      visible_for_user: payment.visible_for_user === '1' || payment.visible_for_user === 1,
      generate_invoice: payment.generate_invoice === '1' || payment.generate_invoice === 1,
      coupon: payment.coupon,
      coupon_discount: parseFloat(String(payment.coupon_discount)) || 0,
      tax: parseFloat(String(payment.tax)) || 0,
      description: payment.description,
      metadata: parseStuff(payment.stuff),
      created_at: payment.created_time,
      callback_at: payment.callback_time,
      is_legacy: true,
    });

    if (error) {
      console.log(`❌ Failed payment #${payment.id}: ${error.message}`);
      failed++;
    } else {
      migrated++;
      if (migrated % 100 === 0) {
        console.log(`   Migrated ${migrated} records...`);
      }
    }
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log('========================================\n');
}

migratePaymentHistory().catch(console.error);

