/**
 * FAST Legacy Users Migration Script
 * 
 * Optimized for speed with:
 * - Batch processing (10 users at a time)
 * - Pre-loading existing users
 * - Parallel API calls
 * 
 * Run with: npx tsx scripts/migrate-users-fast.ts
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

const BATCH_SIZE = 50; // Process 50 users at a time (reduced for stability)
const isDryRun = process.argv.includes('--dry-run');
const startFrom = parseInt(process.argv.find(arg => arg.startsWith('--start='))?.split('=')[1] || '0');

interface LegacyUserData {
  id?: string | number;
  ids?: string;
  username?: string | null;
  email_address?: string;
  password?: string;
  status?: string | number;
  first_name?: string | null;
  last_name?: string | null;
  country?: string | null;
  phone?: string | null;
  role_ids?: string | null;
  email_verified?: string | number | boolean;
  affiliate_code?: string | null;
  referred_by?: string | null;
  created_time?: string | null;
  update_time?: string | null;
}

function normalizeUser(user: LegacyUserData) {
  return {
    legacy_id: Number(user.id),
    legacy_ids: user.ids || '',
    username: user.username || null,
    email: (user.email_address || '').toLowerCase().trim(),
    password_hash: user.password || '',
    status: user.status,
    first_name: user.first_name || null,
    last_name: user.last_name || null,
    country: user.country || null,
    phone: user.phone || null,
    role_ids: user.role_ids || null,
    email_verified: user.email_verified === '1' || user.email_verified === 1 || user.email_verified === true,
    affiliate_id: user.affiliate_code || null,
    referred_by: user.referred_by || null,
    legacy_created_time: user.created_time || null,
    legacy_updated_time: user.update_time || null,
  };
}

async function getAllExistingEmails(): Promise<Set<string>> {
  console.log('📋 Loading existing Supabase users...');
  const emails = new Set<string>();
  
  let page = 1;
  const perPage = 1000;
  
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    
    if (error) {
      console.error('Error loading users:', error);
      break;
    }
    
    if (!data.users || data.users.length === 0) break;
    
    for (const user of data.users) {
      if (user.email) {
        emails.add(user.email.toLowerCase());
      }
    }
    
    if (data.users.length < perPage) break;
    page++;
  }
  
  console.log(`   Found ${emails.size} existing users in Supabase\n`);
  return emails;
}

async function getMigratedLegacyIds(): Promise<Set<number>> {
  console.log('📋 Loading already migrated legacy IDs...');
  const ids = new Set<number>();
  
  const { data, error } = await supabase
    .from('legacy_users')
    .select('legacy_id')
    .eq('migrated', true);
  
  if (error) {
    console.error('Error loading legacy users:', error);
    return ids;
  }
  
  for (const row of data || []) {
    ids.add(row.legacy_id);
  }
  
  console.log(`   Found ${ids.size} already migrated legacy users\n`);
  return ids;
}

async function migrateUser(user: ReturnType<typeof normalizeUser>, existingEmails: Set<string>): Promise<{
  status: 'created' | 'skipped' | 'failed';
  email: string;
  error?: string;
}> {
  const email = user.email;
  
  // Skip invalid emails
  if (!email || !email.includes('@')) {
    return { status: 'skipped', email: email || 'invalid', error: 'Invalid email' };
  }

  // Skip if already exists
  if (existingEmails.has(email)) {
    return { status: 'skipped', email };
  }

  if (isDryRun) {
    return { status: 'created', email };
  }

  // Convert PHP bcrypt hash ($2y$) to standard bcrypt ($2a$)
  let passwordHash = user.password_hash;
  if (passwordHash.startsWith('$2y$')) {
    passwordHash = '$2a$' + passwordHash.substring(4);
  }

  // Create user in Supabase Auth
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
    return { status: 'failed', email, error: createError.message };
  }

  // Update password hash
  await supabase.rpc('set_user_password_hash', {
    target_user_id: newUser.user.id,
    new_password_hash: passwordHash,
  });

  // Add to existing emails set so we don't try to create again
  existingEmails.add(email);

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
      email_verified: user.email_verified,
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

  // Update profile with retry (trigger might not have created it yet)
  // Wait for profile to exist, then update is_legacy_user = true
  let profileUpdated = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username: user.username || email.split('@')[0],
        first_name: user.first_name,
        last_name: user.last_name,
        country: user.country,
        phone: user.phone,
        is_legacy_user: true,
        legacy_user_id: user.legacy_id,
        email_verified: user.email_verified,
      })
      .eq('id', newUser.user.id)
      .select();
    
    if (data && data.length > 0) {
      profileUpdated = true;
      break;
    }
    
    // Wait 100ms before retry
    await new Promise(r => setTimeout(r, 100));
  }
  
  // If still not updated after retries, create it manually
  if (!profileUpdated) {
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
        email_verified: user.email_verified,
      });
  }

  return { status: 'created', email };
}

async function migrateAllUsers() {
  console.log('🚀 Starting FAST legacy users migration...');
  if (isDryRun) {
    console.log('   (DRY RUN - no changes will be made)');
  }
  console.log(`   Batch size: ${BATCH_SIZE} users at a time\n`);

  const dataPath = path.join(process.cwd(), 'scripts/data/legacy_users.json');

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const legacyUsers: LegacyUserData[] = JSON.parse(rawData);

  console.log(`📦 Found ${legacyUsers.length} users in JSON file\n`);

  // Pre-load existing data
  const existingEmails = await getAllExistingEmails();
  const migratedIds = await getMigratedLegacyIds();

  // Filter out already migrated users
  const usersToMigrate = legacyUsers
    .map(normalizeUser)
    .filter(u => !migratedIds.has(u.legacy_id) && u.email && u.email.includes('@'));

  console.log(`📦 ${usersToMigrate.length} users to migrate (after filtering)\n`);

  if (startFrom > 0) {
    console.log(`⏭️  Starting from index ${startFrom}\n`);
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { email: string; error: string }[] = [];
  const startTime = Date.now();

  // Process in batches
  for (let i = startFrom; i < usersToMigrate.length; i += BATCH_SIZE) {
    const batch = usersToMigrate.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.all(
      batch.map(async user => {
        try {
          return await migrateUser(user, existingEmails);
        } catch (err: any) {
          return { status: 'failed' as const, email: user.email, error: err.message || 'Unknown error' };
        }
      })
    );

    for (const result of results) {
      if (result.status === 'created') {
        created++;
        console.log(`✅ Created: ${result.email}`);
      } else if (result.status === 'skipped') {
        skipped++;
      } else {
        failed++;
        errors.push({ email: result.email, error: result.error || 'Unknown error' });
        console.log(`❌ Failed: ${result.email} - ${result.error}`);
      }
    }

    // Progress update every 100 users
    const processed = i + batch.length;
    if (processed % 100 === 0 || processed === usersToMigrate.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = created / elapsed;
      const remaining = usersToMigrate.length - processed;
      const eta = remaining / rate / 60;
      
      console.log(`\n📊 Progress: ${processed}/${usersToMigrate.length} (${(processed/usersToMigrate.length*100).toFixed(1)}%)`);
      console.log(`   Created: ${created} | Skipped: ${skipped} | Failed: ${failed}`);
      console.log(`   Rate: ${rate.toFixed(1)} users/sec | ETA: ${eta.toFixed(1)} min\n`);
    }
  }

  const totalTime = (Date.now() - startTime) / 1000 / 60;

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Created:  ${created}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log(`   ⏱️  Time:     ${totalTime.toFixed(1)} minutes`);
  console.log('========================================\n');

  if (errors.length > 0 && errors.length <= 20) {
    console.log('❌ Errors:');
    errors.forEach(e => console.log(`   ${e.email}: ${e.error}`));
  } else if (errors.length > 20) {
    console.log(`❌ ${errors.length} errors (showing first 20):`);
    errors.slice(0, 20).forEach(e => console.log(`   ${e.email}: ${e.error}`));
  }
}

migrateAllUsers().catch(console.error);






