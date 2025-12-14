/**
 * Script to update password hashes for already migrated users
 * 
 * Run with: npx tsx scripts/update-password-hashes.ts
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

async function updatePasswordHashes() {
  console.log('🔐 Updating password hashes for migrated users...\n');

  // Get all legacy users that have been migrated (have supabase_user_id)
  const { data: legacyUsers, error } = await supabase
    .from('legacy_users')
    .select('legacy_id, email, password_hash, supabase_user_id')
    .not('supabase_user_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching legacy users:', error.message);
    return;
  }

  if (!legacyUsers || legacyUsers.length === 0) {
    console.log('No migrated users found.');
    return;
  }

  console.log(`📦 Found ${legacyUsers.length} migrated users\n`);

  let updated = 0;
  let failed = 0;

  for (const user of legacyUsers) {
    if (!user.supabase_user_id || !user.password_hash) {
      continue;
    }

    // Convert PHP bcrypt hash ($2y$) to standard bcrypt ($2a$)
    let passwordHash = user.password_hash;
    if (passwordHash.startsWith('$2y$')) {
      passwordHash = '$2a$' + passwordHash.substring(4);
    }

    // Update the password hash using our RPC function
    const { error: updateError } = await supabase.rpc('set_user_password_hash', {
      target_user_id: user.supabase_user_id,
      new_password_hash: passwordHash,
    });

    if (updateError) {
      console.log(`❌ Failed to update ${user.email}: ${updateError.message}`);
      failed++;
    } else {
      console.log(`✅ Updated password hash: ${user.email}`);
      updated++;
    }
  }

  console.log('\n========================================');
  console.log('📊 Summary:');
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log('========================================\n');

  if (updated > 0) {
    console.log('🎉 Users can now login with their original passwords!');
  }
}

updatePasswordHashes().catch(console.error);







