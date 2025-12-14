/**
 * Script to migrate legacy usage data to Supabase
 * 
 * Legacy table structure (ait_stats or similar):
 * - id: int (PK)
 * - user_ids: char(50) - legacy user identifier
 * - payg_balance: int - pay as you go balance remaining
 * - payg_purchased: bigint - total characters purchased
 * - characters_preview_used: bigint - characters used for previews
 * - characters_production_used: bigint - characters used for final audio
 * - voice_generated: int - number of voice files generated
 * 
 * Run with: npx tsx scripts/migrate-legacy-usage.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface LegacyUsage {
  id: number | string;
  user_ids: string;
  payg_balance: number | string;
  payg_purchased: number | string;
  characters_preview_used: number | string;
  characters_production_used: number | string;
  voice_generated: number | string;
}

function toBigIntString(value: unknown): string {
  if (value === null || value === undefined) return '0';
  const s = String(value).trim();
  if (!s) return '0';
  try {
    // Handles integers stored as strings in JSON exports
    return BigInt(s).toString();
  } catch {
    // Fallback for weird values
    const n = Number(s);
    if (!Number.isFinite(n)) return '0';
    return BigInt(Math.trunc(n)).toString();
  }
}

function toInt(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).trim() || '0');
  return Number.isFinite(n) ? Math.trunc(n) : 0;
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

async function migrateLegacyUsage() {
  console.log('Starting legacy usage migration...\n');

  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(0, parseInt(limitArg.split('=')[1], 10)) : undefined;

  // Read legacy usage data from JSON file
  const dataPath = path.join(__dirname, 'data', 'legacy_usage.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    console.log('\nTo migrate legacy usage:');
    console.log('1. Export your legacy usage table to JSON');
    console.log('2. Save it as scripts/data/legacy_usage.json');
    console.log('3. Run this script again\n');
    console.log('Example MySQL export command:');
    console.log('  mysql -u user -p database -e "SELECT * FROM ait_user_stats" > legacy_usage.json');
    return;
  }

  const legacyData: LegacyUsage[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const input = limit ? legacyData.slice(0, limit) : legacyData;
  console.log(`Found ${legacyData.length} legacy usage records (${input.length} will be processed)\n`);

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local');
  }

  const userMap = await loadLegacyUserMap();

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  // Create a historical usage record for "legacy" period.
  // Use a date in the past to indicate this is legacy data.
  const legacyPeriodStart = '2020-01-01';
  const legacyPeriodEnd = '2024-11-30';

  // Batch upserts for speed (and idempotency via unique(user_id, period_start))
  const BATCH_SIZE = 500;
  let batch: Array<Record<string, unknown>> = [];

  const flush = async () => {
    if (batch.length === 0) return;
    if (isDryRun) {
      migrated += batch.length;
      batch = [];
      return;
    }

    const { error: upsertError } = await supabase
      .from('usage_tracking')
      .upsert(batch, { onConflict: 'user_id,period_start', ignoreDuplicates: true });

    if (upsertError) {
      console.error(`❌ Batch upsert failed (${batch.length} rows):`, upsertError.message);
      errors += batch.length;
      batch = [];
      return;
    }

    migrated += batch.length;
    batch = [];
  };

  for (const usage of input) {
    const supabaseUserId = userMap.get(usage.user_ids);
    if (!supabaseUserId) {
      skipped++;
      continue;
    }

    const paygBalance = toBigIntString(usage.payg_balance);
    const paygPurchased = toBigIntString(usage.payg_purchased);
    const previewUsed = toBigIntString(usage.characters_preview_used);
    const productionUsed = toBigIntString(usage.characters_production_used);
    const totalUsed = (BigInt(previewUsed) + BigInt(productionUsed)).toString();
    const voiceGenerated = toInt(usage.voice_generated);

    batch.push({
      user_id: supabaseUserId,
      period_start: legacyPeriodStart,
      period_end: legacyPeriodEnd,
      characters_used: totalUsed,
      characters_preview_used: previewUsed,
      characters_production_used: productionUsed,
      audio_files_generated: voiceGenerated,
      projects_created: 0, // Unknown from legacy data
      payg_balance: paygBalance,
      payg_purchased: paygPurchased,
      is_legacy_data: true,
    });

    if (batch.length >= BATCH_SIZE) {
      await flush();
      process.stdout.write(`\r⏳ processed=${migrated + skipped + errors} migrated=${migrated} skipped=${skipped} errors=${errors}`);
    }
  }

  await flush();

  console.log('\n' + '='.repeat(50));
  console.log('Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

migrateLegacyUsage()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });









