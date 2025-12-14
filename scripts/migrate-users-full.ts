/**
 * FULL Legacy Users Migration Script
 * 
 * This script migrates ALL legacy users to Supabase Auth with their original password hash.
 * Users can login immediately with their existing password - no reset needed!
 * 
 * Run with: npx tsx scripts/migrate-users-full.ts
 * 
 * For dry run: npx tsx scripts/migrate-users-full.ts --dry-run
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

interface LegacyUserData {
  // Support both formats (aliased from SQL or direct from table)
  legacy_id?: number;
  id?: string | number;
  legacy_ids?: string;
  ids?: string;
  username?: string | null;
  email?: string;
  email_address?: string;
  password_hash?: string;
  password?: string;
  status?: string | number;
  first_name?: string | null;
  last_name?: string | null;
  country?: string | null;
  phone?: string | null;
  role_ids?: string | null;
  email_verified?: string | number | boolean;
  affiliate_id?: string | null;
  affiliate_code?: string | null;
  referred_by?: string | null;
  legacy_created_time?: string | null;
  created_time?: string | null;
  legacy_updated_time?: string | null;
  update_time?: string | null;
}

function normalizeUser(user: LegacyUserData) {
  return {
    legacy_id: user.legacy_id || Number(user.id),
    legacy_ids: user.legacy_ids || user.ids || '',
    username: user.username || null,
    email: (user.email || user.email_address || '').toLowerCase().trim(),
    password_hash: user.password_hash || user.password || '',
    status: user.status,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    country: user.country || null,
    phone: user.phone || null,
    role_ids: user.role_ids || null,
    email_verified: user.email_verified === '1' || user.email_verified === 1 || user.email_verified === true,
    affiliate_id: user.affiliate_id || user.affiliate_code || null,
    referred_by: user.referred_by || null,
    legacy_created_time: user.legacy_created_time || user.created_time || null,
    legacy_updated_time: user.legacy_updated_time || user.update_time || null,
  };
}

async function migrateAllUsers() {
  console.log('🚀 Starting FULL legacy users migration...');
  if (isDryRun) {
    console.log('   (DRY RUN - no changes will be made)\n');
  } else {
    console.log('');
  }

  const dataPath = path.join(process.cwd(), 'scripts/data/legacy_users.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    console.log('\nPlease create the file with your legacy user data.');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const legacyUsers: LegacyUserData[] = JSON.parse(rawData);

  console.log(`📦 Found ${legacyUsers.length} users to migrate\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { email: string; error: string }[] = [];

  for (const rawUser of legacyUsers) {
    // Normalize user data to handle both formats
    const user = normalizeUser(rawUser);
    const email = user.email;
    
    // Skip invalid emails
    if (!email || !email.includes('@')) {
      console.log(`⏭️  Skipping invalid email: ${email}`);
      skipped++;
      continue;
    }

    // Check if user already exists in Supabase Auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email);

    if (existingUser) {
      // User already exists - just link to legacy_users if not already linked
      const { data: legacyRecord } = await supabase
        .from('legacy_users')
        .select('supabase_user_id')
        .eq('legacy_id', user.legacy_id)
        .single();

      if (!legacyRecord?.supabase_user_id) {
        if (!isDryRun) {
          await supabase
            .from('legacy_users')
            .update({
              supabase_user_id: existingUser.id,
              migrated: true,
              migrated_at: new Date().toISOString(),
            })
            .eq('legacy_id', user.legacy_id);
        }
        console.log(`🔗 Linked existing user: ${email} → ${existingUser.id}`);
      } else {
        console.log(`⏭️  Already migrated: ${email}`);
      }
      skipped++;
      continue;
    }

    // Convert PHP bcrypt hash ($2y$) to standard bcrypt ($2a$)
    // Supabase/bcryptjs can handle both, but $2a$ is more universal
    let passwordHash = user.password_hash;
    if (passwordHash.startsWith('$2y$')) {
      passwordHash = '$2a$' + passwordHash.substring(4);
    }

    if (isDryRun) {
      console.log(`🔍 Would create: ${email} (legacy_id: ${user.legacy_id})`);
      created++;
      continue;
    }

    // Create user in Supabase Auth
    // We create with a temp password, then update the hash directly
    const tempPassword = 'TempMigration' + Math.random().toString(36).substring(2, 10) + '!';
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: user.email_verified,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
        is_legacy_user: true,
        legacy_id: user.legacy_id,
      },
    });

    if (createError) {
      console.log(`❌ Failed: ${email} - ${createError.message}`);
      errors.push({ email, error: createError.message });
      failed++;
      continue;
    }

    // Try to update the password hash directly using our RPC function
    const { error: hashError } = await supabase.rpc('set_user_password_hash', {
      target_user_id: newUser.user.id,
      new_password_hash: passwordHash,
    });

    if (hashError) {
      // RPC function not available - user will use legacy login flow
      // The legacy login already handles password verification
      console.log(`✅ Created: ${email} → ${newUser.user.id} (will use legacy password on login)`);
    } else {
      console.log(`✅ Created: ${email} → ${newUser.user.id} (with original password)`);
    }

    created++;

    // Update legacy_users table
    await supabase
      .from('legacy_users')
      .upsert({
        legacy_id: user.legacy_id,
        legacy_ids: user.legacy_ids,
        username: user.username || email.split('@')[0],
        email: email,
        password_hash: user.password_hash,
        status: typeof user.status === 'string' ? (user.status === 'active' || user.status === '1' ? 1 : 0) : user.status,
        first_name: user.first_name,
        last_name: user.last_name,
        country: user.country,
        phone: user.phone,
        role_ids: user.role_ids,
        email_verified: !!user.email_verified,
        affiliate_id: user.affiliate_id,
        referred_by: user.referred_by,
        legacy_created_time: user.legacy_created_time,
        legacy_updated_time: user.legacy_updated_time,
        migrated: true,
        migrated_at: new Date().toISOString(),
        supabase_user_id: newUser.user.id,
      }, {
        onConflict: 'legacy_id',
      });

    // Create/update profile
    await supabase
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email,
        username: user.username || email.split('@')[0],
        first_name: user.first_name,
        last_name: user.last_name,
        country: user.country,
        phone: user.phone,
        is_legacy_user: true,
        legacy_user_id: user.legacy_id,
        email_verified: !!user.email_verified,
      });
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Created:  ${created}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed:  ${failed}`);
  console.log('========================================\n');

  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(e => console.log(`   - ${e.email}: ${e.error}`));
    console.log('');
  }

  if (!isDryRun && created > 0) {
    console.log('ℹ️  Next steps:');
    console.log('   1. Run: npx tsx scripts/migrate-legacy-subscriptions.ts');
    console.log('   2. Run: npx tsx scripts/migrate-legacy-projects.ts');
    console.log('   3. Run: npx tsx scripts/migrate-legacy-usage.ts');
  }
}

migrateAllUsers().catch(console.error);

