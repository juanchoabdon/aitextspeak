/**
 * Script to delete a test user completely
 * 
 * Run with: npx tsx scripts/delete-test-user.ts
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

async function deleteTestUser() {
  const email = 'jessica@latinleap.vc';
  console.log(`🗑️  Deleting user: ${email}\n`);

  // 1. Find the user in legacy_users
  const { data: legacyUser } = await supabase
    .from('legacy_users')
    .select('legacy_id, supabase_user_id')
    .eq('email', email)
    .single();

  if (legacyUser?.supabase_user_id) {
    // 2. Delete subscriptions
    const { error: subError } = await supabase
      .from('subscriptions')
      .delete()
      .eq('user_id', legacyUser.supabase_user_id);
    
    if (!subError) {
      console.log('✅ Deleted subscriptions');
    }

    // 3. Delete usage_tracking
    const { error: usageError } = await supabase
      .from('usage_tracking')
      .delete()
      .eq('user_id', legacyUser.supabase_user_id);
    
    if (!usageError) {
      console.log('✅ Deleted usage tracking');
    }

    // 4. Delete projects and audio
    const { error: projectsError } = await supabase
      .from('projects')
      .delete()
      .eq('user_id', legacyUser.supabase_user_id);
    
    if (!projectsError) {
      console.log('✅ Deleted projects');
    }

    // 5. Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', legacyUser.supabase_user_id);
    
    if (!profileError) {
      console.log('✅ Deleted profile');
    }

    // 6. Delete from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(
      legacyUser.supabase_user_id
    );
    
    if (!authError) {
      console.log('✅ Deleted from Supabase Auth');
    } else {
      console.log(`⚠️  Auth delete error: ${authError.message}`);
    }
  }

  // 7. Delete from legacy_users
  const { error: legacyError } = await supabase
    .from('legacy_users')
    .delete()
    .eq('email', email);
  
  if (!legacyError) {
    console.log('✅ Deleted from legacy_users');
  }

  console.log(`\n🎉 User ${email} completely deleted!`);
}

deleteTestUser().catch(console.error);









