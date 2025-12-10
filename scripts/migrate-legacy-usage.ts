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
  id: number;
  user_ids: string;
  payg_balance: number;
  payg_purchased: number;
  characters_preview_used: number;
  characters_production_used: number;
  voice_generated: number;
}

async function migrateLegacyUsage() {
  console.log('Starting legacy usage migration...\n');

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
  console.log(`Found ${legacyData.length} legacy usage records\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const usage of legacyData) {
    try {
      // Find the corresponding Supabase user via legacy_users table
      const { data: legacyUser } = await supabase
        .from('legacy_users')
        .select('supabase_user_id, legacy_ids')
        .or(`legacy_ids.eq.${usage.user_ids},legacy_id.eq.${usage.id}`)
        .single();

      if (!legacyUser?.supabase_user_id) {
        console.log(`⏭️  Skipping usage for user_ids ${usage.user_ids} - user not migrated yet`);
        skipped++;
        continue;
      }

      const supabaseUserId = legacyUser.supabase_user_id;

      // Calculate total characters used
      const totalCharactersUsed = 
        (usage.characters_preview_used || 0) + 
        (usage.characters_production_used || 0);

      // Check if we already have usage data for this user
      const { data: existingUsage } = await supabase
        .from('usage_tracking')
        .select('id')
        .eq('user_id', supabaseUserId)
        .single();

      if (existingUsage) {
        console.log(`⏭️  User ${usage.user_ids} already has usage data, skipping`);
        skipped++;
        continue;
      }

      // Create a historical usage record for "legacy" period
      // Use a date in the past to indicate this is legacy data
      const legacyPeriodStart = '2020-01-01';
      const legacyPeriodEnd = '2024-11-30';

      const { error: insertError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: supabaseUserId,
          period_start: legacyPeriodStart,
          period_end: legacyPeriodEnd,
          characters_used: totalCharactersUsed,
          audio_files_generated: usage.voice_generated || 0,
          projects_created: 0, // Unknown from legacy data
        });

      if (insertError) {
        console.error(`❌ Error inserting usage for ${usage.user_ids}:`, insertError.message);
        errors++;
        continue;
      }

      // Also update the user's profile with their PAYG balance if they have one
      if (usage.payg_balance > 0 || usage.payg_purchased > 0) {
        // Store PAYG data in profiles metadata or a separate table
        // For now, just log it
        console.log(`   💰 User has PAYG: balance=${usage.payg_balance}, purchased=${usage.payg_purchased}`);
      }

      console.log(`✅ Migrated usage for user_ids ${usage.user_ids}:`);
      console.log(`   Characters: ${totalCharactersUsed.toLocaleString()} (preview: ${usage.characters_preview_used?.toLocaleString() || 0}, production: ${usage.characters_production_used?.toLocaleString() || 0})`);
      console.log(`   Voice files: ${usage.voice_generated || 0}`);
      migrated++;

    } catch (error) {
      console.error(`❌ Error processing usage ${usage.id}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Migration Summary:');
  console.log(`  ✅ Migrated: ${migrated}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

// Also create a function to add PAYG balance column if needed
async function addPaygColumns() {
  console.log('\nNote: If you want to track PAYG balances, you may need to add columns:');
  console.log('  - payg_balance: Characters remaining from PAYG purchases');
  console.log('  - payg_purchased: Total characters ever purchased via PAYG');
  console.log('\nRun this SQL in Supabase:');
  console.log(`
ALTER TABLE public.usage_tracking
ADD COLUMN IF NOT EXISTS payg_balance BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS payg_purchased BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_legacy_data BOOLEAN DEFAULT FALSE;
`);
}

migrateLegacyUsage()
  .then(() => {
    addPaygColumns();
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });



