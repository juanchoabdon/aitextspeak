/**
 * Script to import legacy users from MySQL to Supabase legacy_users table
 * 
 * This does NOT create Supabase Auth users - that happens when users first login.
 * This only imports the data to legacy_users table for later migration.
 * 
 * Run with: npx tsx scripts/migrate-legacy-users.ts
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

interface LegacyUserData {
  legacy_id: number;
  legacy_ids: string;
  username: string;
  email: string;
  password_hash: string;
  status: string;
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  phone: string | null;
  role_ids: string | null;
  email_verified: number;
  affiliate_id: string | null;
  referred_by: string | null;
  legacy_created_time: string | null;
  legacy_updated_time: string | null;
}

async function migrateLegacyUsers() {
  console.log('🚀 Starting legacy users import...\n');

  const dataPath = path.join(process.cwd(), 'scripts/data/legacy_users.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    console.log('\nPlease create the file with your legacy user data.');
    console.log('See scripts/MIGRATION.md for the expected format.');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const legacyUsers: LegacyUserData[] = JSON.parse(rawData);

  console.log(`📦 Found ${legacyUsers.length} users to import\n`);

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of legacyUsers) {
    // Check if already imported
    const { data: existing } = await supabase
      .from('legacy_users')
      .select('legacy_id')
      .eq('legacy_id', user.legacy_id)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping user #${user.legacy_id} (${user.email}) - already imported`);
      skipped++;
      continue;
    }

    // Also check by email
    const { data: existingByEmail } = await supabase
      .from('legacy_users')
      .select('legacy_id')
      .eq('email', user.email.toLowerCase())
      .single();

    if (existingByEmail) {
      console.log(`⏭️  Skipping user #${user.legacy_id} (${user.email}) - email already exists`);
      skipped++;
      continue;
    }

    // Map status to smallint (1 = active, 0 = inactive)
    let statusNum = 1; // default active
    if (typeof user.status === 'string') {
      statusNum = user.status.toLowerCase() === 'active' || user.status === '1' ? 1 : 0;
    } else if (typeof user.status === 'number') {
      statusNum = user.status;
    }

    // Insert to legacy_users table
    const { error } = await supabase.from('legacy_users').insert({
      legacy_id: user.legacy_id,
      legacy_ids: user.legacy_ids,
      username: user.username || user.email.split('@')[0], // fallback to email prefix if no username
      email: user.email.toLowerCase(),
      password_hash: user.password_hash,
      status: statusNum,
      first_name: user.first_name,
      last_name: user.last_name,
      country: user.country,
      phone: user.phone,
      role_ids: user.role_ids,
      email_verified: user.email_verified === 1,
      affiliate_id: user.affiliate_id,
      referred_by: user.referred_by,
      legacy_created_time: user.legacy_created_time,
      legacy_updated_time: user.legacy_updated_time,
      migrated: false,
      supabase_user_id: null,
    });

    if (error) {
      console.log(`❌ Failed to import user #${user.legacy_id} (${user.email}): ${error.message}`);
      failed++;
    } else {
      console.log(`✅ Imported user #${user.legacy_id}: ${user.email} (${user.first_name || ''} ${user.last_name || ''})`);
      imported++;
    }
  }

  console.log('\n========================================');
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log('========================================\n');

  if (imported > 0) {
    console.log('ℹ️  Users are now in legacy_users table.');
    console.log('   They will be fully migrated when they first login with their old password.');
    console.log('\n   To test: Go to /auth/signin and login with the legacy email/password.');
  }
}

migrateLegacyUsers().catch(console.error);

