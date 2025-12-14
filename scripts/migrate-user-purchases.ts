/**
 * Script to migrate user purchases from ait_payment_purchased
 * 
 * This table tracks what plan each user has purchased/activated,
 * including free plans. Important for:
 * - Historical record of plans
 * - Characters used per plan period
 * - Free plan users (not in subscriptions table)
 * 
 * Run with: npx tsx scripts/migrate-user-purchases.ts
 *
 * Options:
 *   --input=/absolute/or/relative/path.json   (default: scripts/data/legacy_payment_purchased.json, then scripts/data/AIT Payment Purchased.json)
 *   --dry-run                                (no writes)
 *   --start-index=N                          (default: 0)
 *   --end-index=N                            (default: none)
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

interface LegacyPaymentPurchased {
  id: number;
  ids: string;
  user_ids: string;
  payment_ids: string;
  item_type: string;
  item_ids: string;
  item_name: string;
  created_time: string;
  description: string | null;
  stuff: string | null;
  used_up: string | number;
  auto_renew: string | number;
  stuff_voicelab: string | null;
}

interface StuffData {
  characters_limit?: string | number;
  characters_used?: number;
  [key: string]: unknown;
}

async function loadLegacyUserMap(): Promise<Map<string, string>> {
  console.log('📋 Loading legacy_users mapping (legacy_ids -> supabase_user_id)...');
  const map = new Map<string, string>();

  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('legacy_users')
      .select('legacy_ids, supabase_user_id')
      .not('supabase_user_id', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load legacy_users mapping: ${error.message}`);
    }
    const rows = data || [];
    if (rows.length === 0) break;

    for (const r of rows as Array<{ legacy_ids: string | null; supabase_user_id: string | null }>) {
      if (r.legacy_ids && r.supabase_user_id) {
        map.set(r.legacy_ids, r.supabase_user_id);
      }
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  console.log(`   Found ${map.size} legacy_ids mapped\n`);
  return map;
}

function parseStuff(stuff: string | null): StuffData | null {
  if (!stuff) return null;
  try {
    return JSON.parse(stuff);
  } catch {
    return null;
  }
}

function parseCharactersLimit(limit: string | number | undefined): number | null {
  if (limit === undefined || limit === '' || limit === null) return null;
  const parsed = parseInt(String(limit), 10);
  return isNaN(parsed) ? null : parsed;
}

function toInt(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(String(value).trim() || String(fallback));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toBool01(value: unknown): boolean {
  return value === '1' || value === 1 || value === true || value === 'true';
}

function parseLegacyTimestamp(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === '0000-00-00 00:00:00') return null;
  try {
    // Treat legacy timestamps as UTC for consistency with other migration scripts.
    return new Date(s.replace(' ', 'T') + 'Z').toISOString();
  } catch {
    return null;
  }
}

async function migrateUserPurchases() {
  console.log('🛒 Starting user purchases migration...\n');

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const inputArg = args.find(a => a.startsWith('--input='));
  const inputPath = inputArg ? inputArg.split('=').slice(1).join('=') : undefined;
  const startIndexArg = args.find(a => a.startsWith('--start-index='));
  const endIndexArg = args.find(a => a.startsWith('--end-index='));
  const startIndex = startIndexArg ? Math.max(0, parseInt(startIndexArg.split('=')[1], 10)) : 0;
  const endIndex = endIndexArg ? Math.max(0, parseInt(endIndexArg.split('=')[1], 10)) : undefined;

  const candidatePaths = [
    inputPath,
    path.join(process.cwd(), 'scripts/data/legacy_payment_purchased.json'),
    path.join(process.cwd(), 'scripts/data/AIT Payment Purchased.json'),
  ].filter(Boolean) as string[];

  const dataPath = candidatePaths.find(p => fs.existsSync(p));

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    console.log('\nTo migrate user purchases:');
    console.log('1. Export ait_payment_purchased from MySQL to JSON');
    console.log('2. Save it as scripts/data/legacy_payment_purchased.json');
    console.log('\nSQL:');
    console.log('  SELECT * FROM ait_payment_purchased');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const purchases: LegacyPaymentPurchased[] = JSON.parse(rawData);

  const selected = purchases.slice(startIndex, endIndex ?? purchases.length);
  console.log(`📦 Found ${purchases.length} purchase records (${selected.length} will be processed)\n`);

  const userMap = await loadLegacyUserMap();

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches for better performance
  const batchSize = 1000;
  for (let i = 0; i < selected.length; i += batchSize) {
    const batch = selected.slice(i, i + batchSize);

    const rows: Array<Record<string, unknown>> = [];
    for (const purchase of batch) {
      const stuffData = parseStuff(purchase.stuff);
      const voicelabData = parseStuff(purchase.stuff_voicelab);

      const MAX_INT32 = 2147483647;

      const rawLimit = stuffData?.characters_limit;
      const limitParsed = parseCharactersLimit(rawLimit);
      const charactersLimit = limitParsed !== null && limitParsed > MAX_INT32 ? MAX_INT32 : limitParsed;

      const rawUsed = (stuffData as StuffData | null)?.characters_used;
      let charactersUsed = toInt(rawUsed, 0);
      if (charactersUsed > MAX_INT32) charactersUsed = MAX_INT32;

      const userId = userMap.get(purchase.user_ids) || null;
      const createdAt = parseLegacyTimestamp(purchase.created_time) || new Date().toISOString();

      rows.push({
        user_id: userId,
        legacy_id: typeof purchase.id === 'string' ? toInt(purchase.id, 0) : purchase.id,
        legacy_ids: purchase.ids,
        legacy_user_ids: purchase.user_ids,
        legacy_payment_ids: purchase.payment_ids,
        item_type: purchase.item_type || 'purchase',
        item_ids: purchase.item_ids,
        item_name: purchase.item_name,
        characters_limit: charactersLimit,
        characters_used: charactersUsed,
        used_up: toBool01(purchase.used_up),
        auto_renew: toBool01(purchase.auto_renew),
        voicelab_data: voicelabData,
        description: purchase.description || null,
        metadata: stuffData,
        created_at: createdAt,
        is_legacy: true,
      });
    }

    if (isDryRun) {
      migrated += rows.length;
      console.log(`   (dry-run) Processed ${Math.min(i + batchSize, selected.length)} / ${selected.length} records...`);
      continue;
    }

    // Idempotent insert by legacy_id (unique).
    // ignoreDuplicates=true means already-migrated rows won't be updated.
    const { error } = await supabase
      .from('user_purchases')
      .upsert(rows, { onConflict: 'legacy_id', ignoreDuplicates: true });

    if (error) {
      console.log(`❌ Batch failed at offset ${i}: ${error.message}`);
      failed += rows.length;
    } else {
      migrated += rows.length;
    }

    console.log(`   Processed ${Math.min(i + batchSize, selected.length)} / ${selected.length} records...`);
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log('========================================\n');
}

migrateUserPurchases().catch(console.error);







