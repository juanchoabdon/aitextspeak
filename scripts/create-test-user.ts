/**
 * Script to create a Supabase Auth user for testing
 * This simulates what happens when a legacy user logs in
 * 
 * Run with: npx tsx scripts/create-test-user.ts
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

async function createTestUser() {
  // Get the legacy user from our JSON
  const usersPath = path.join(process.cwd(), 'scripts/data/legacy_users.json');
  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  
  if (users.length === 0) {
    console.log('❌ No users in legacy_users.json');
    return;
  }

  const legacyUser = users[0];
  console.log(`\n🔧 Creating Supabase Auth user for: ${legacyUser.email}\n`);

  // Check if user already exists in legacy_users with a supabase_user_id
  const { data: existingLegacy } = await supabase
    .from('legacy_users')
    .select('supabase_user_id, email')
    .eq('legacy_id', legacyUser.legacy_id)
    .single();

  if (existingLegacy?.supabase_user_id) {
    console.log(`✅ User already has Supabase account: ${existingLegacy.supabase_user_id}`);
    return existingLegacy.supabase_user_id;
  }

  // Check if user exists in auth.users by email
  const { data: existingAuth } = await supabase.auth.admin.listUsers();
  const existingUser = existingAuth?.users?.find(u => u.email === legacyUser.email.toLowerCase());
  
  if (existingUser) {
    console.log(`⚠️  User already exists in Supabase Auth: ${existingUser.id}`);
    
    // Link to legacy_users
    await supabase
      .from('legacy_users')
      .update({
        supabase_user_id: existingUser.id,
        migrated: true,
        migrated_at: new Date().toISOString(),
      })
      .eq('legacy_id', legacyUser.legacy_id);
    
    console.log(`✅ Linked legacy user to existing Supabase account`);
    return existingUser.id;
  }

  // Create new Supabase Auth user with a temporary password
  // In production, the user would login with their legacy password
  const tempPassword = 'TempPassword123!';
  
  const { data: newUser, error } = await supabase.auth.admin.createUser({
    email: legacyUser.email.toLowerCase(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: legacyUser.first_name,
      last_name: legacyUser.last_name,
      is_legacy_user: true,
    },
  });

  if (error) {
    console.log(`❌ Failed to create user: ${error.message}`);
    return null;
  }

  console.log(`✅ Created Supabase Auth user: ${newUser.user.id}`);
  console.log(`   Email: ${legacyUser.email}`);
  console.log(`   Temp Password: ${tempPassword}`);

  // Update legacy_users with the new supabase_user_id
  await supabase
    .from('legacy_users')
    .update({
      supabase_user_id: newUser.user.id,
      migrated: true,
      migrated_at: new Date().toISOString(),
    })
    .eq('legacy_id', legacyUser.legacy_id);

  console.log(`✅ Linked to legacy user #${legacyUser.legacy_id}`);

  // Create/update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: newUser.user.id,
      email: legacyUser.email.toLowerCase(),
      username: legacyUser.username || legacyUser.email.split('@')[0],
      first_name: legacyUser.first_name,
      last_name: legacyUser.last_name,
      country: legacyUser.country,
      phone: legacyUser.phone,
      is_legacy_user: true,
      legacy_user_id: legacyUser.legacy_id,
      email_verified: legacyUser.email_verified === 1 || legacyUser.email_verified === true,
    });

  if (profileError) {
    console.log(`⚠️  Profile update warning: ${profileError.message}`);
  } else {
    console.log(`✅ Profile created/updated`);
  }

  return newUser.user.id;
}

createTestUser()
  .then((userId) => {
    if (userId) {
      console.log(`\n🎉 User ready! ID: ${userId}`);
      console.log(`\nNow you can run: npx tsx scripts/migrate-legacy-subscriptions.ts`);
    }
  })
  .catch(console.error);

