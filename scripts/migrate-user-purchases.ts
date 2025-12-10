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

async function getUserIdFromLegacyIds(legacyUserIds: string): Promise<string | null> {
  const { data } = await supabase
    .from('legacy_users')
    .select('supabase_user_id')
    .eq('legacy_ids', legacyUserIds)
    .single();
  
  return data?.supabase_user_id || null;
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

async function migrateUserPurchases() {
  console.log('🛒 Starting user purchases migration...\n');

  const dataPath = path.join(process.cwd(), 'scripts/data/legacy_payment_purchased.json');

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

  console.log(`📦 Found ${purchases.length} purchase records to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  let usageUpdated = 0;

  // Process in batches for better performance
  const batchSize = 100;
  
  for (let i = 0; i < purchases.length; i += batchSize) {
    const batch = purchases.slice(i, i + batchSize);
    
    for (const purchase of batch) {
      // Check if already migrated
      const { data: existing } = await supabase
        .from('user_purchases')
        .select('id')
        .eq('legacy_id', purchase.id)
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Find user
      const userId = await getUserIdFromLegacyIds(purchase.user_ids);

      // Parse stuff JSON
      const stuffData = parseStuff(purchase.stuff);
      const voicelabData = parseStuff(purchase.stuff_voicelab);
      
      const charactersLimit = parseCharactersLimit(stuffData?.characters_limit);
      const charactersUsed = stuffData?.characters_used || 0;

      // Insert purchase record
      const { error } = await supabase.from('user_purchases').insert({
        user_id: userId,
        legacy_id: purchase.id,
        legacy_ids: purchase.ids,
        legacy_user_ids: purchase.user_ids,
        legacy_payment_ids: purchase.payment_ids,
        item_type: purchase.item_type || 'purchase',
        item_ids: purchase.item_ids,
        item_name: purchase.item_name,
        characters_limit: charactersLimit,
        characters_used: charactersUsed,
        used_up: purchase.used_up === '1' || purchase.used_up === 1,
        auto_renew: purchase.auto_renew === '1' || purchase.auto_renew === 1,
        voicelab_data: voicelabData,
        description: purchase.description,
        metadata: stuffData,
        created_at: purchase.created_time,
        is_legacy: true,
      });

      if (error) {
        // Log only first few errors
        if (failed < 5) {
          console.log(`❌ Failed purchase #${purchase.id}: ${error.message}`);
        }
        failed++;
      } else {
        migrated++;

        // Also update/create usage_tracking if user exists and has usage
        if (userId && charactersUsed > 0) {
          const { data: existingUsage } = await supabase
            .from('usage_tracking')
            .select('id, characters_used')
            .eq('user_id', userId)
            .single();

          if (!existingUsage) {
            // Create usage record
            await supabase.from('usage_tracking').insert({
              user_id: userId,
              period_start: purchase.created_time,
              period_end: null, // Ongoing
              characters_used: charactersUsed,
              is_legacy: true,
            });
            usageUpdated++;
          }
        }
      }
    }

    // Progress update every batch
    console.log(`   Processed ${Math.min(i + batchSize, purchases.length)} / ${purchases.length} records...`);
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   📈 Usage records created: ${usageUpdated}`);
  console.log('========================================\n');
}

migrateUserPurchases().catch(console.error);

