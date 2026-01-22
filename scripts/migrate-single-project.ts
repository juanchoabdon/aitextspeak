/**
 * Migrate a single legacy project
 * 
 * USAGE: npx tsx scripts/migrate-single-project.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
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

// The legacy project from the SQL dump
const legacyProject = {
  id: 134820,
  ids: 'pwgkDGSj20bc13c375d7d3b8d3698d8675dd1046bYF5Z9NPt6',
  user_ids: 'fp4D2n0mvffd694ad19753f5d9babd415abdba28eyR0i4n8bq',
  campaign: 'default',
  title: 'Untitled',
  scheme: 'azure',
  engine: 'neural',
  language_code: 'en-US',
  language_name: 'English (US)',
  voice_id: 'en-US-AmberNeural',
  voice_name: 'Female, Amber',
  config: '{"output_format":"mp3","output_volume":"default","spk_rate":"default"}',
  text: 'whats my name?',
  characters_count: 14,
  storage: 'local',
  tts_uri: 'tts_file/user/pwgkDGSj20bc13c375d7d3b8d3698d8675dd1046bYF5Z9NPt6.mp3',
  created_time: '2025-12-01 09:20:47'
};

async function findUserByLegacyIds(legacyUserIds: string): Promise<string | null> {
  console.log(`\n🔍 Looking for user with legacy_ids: ${legacyUserIds}`);
  
  // Try to find by legacy_ids field
  const { data: byIds, error: error1 } = await supabase
    .from('legacy_users')
    .select('legacy_id, email, supabase_user_id, migrated')
    .eq('legacy_ids', legacyUserIds)
    .single();

  if (byIds) {
    console.log(`   Found user by legacy_ids: ${byIds.email}`);
    console.log(`   Migrated: ${byIds.migrated}`);
    console.log(`   Supabase User ID: ${byIds.supabase_user_id || 'NOT YET MIGRATED'}`);
    return byIds.supabase_user_id;
  }

  // If not found, list all users to help debug
  console.log(`   ❌ Not found by legacy_ids`);
  
  const { data: allUsers } = await supabase
    .from('legacy_users')
    .select('legacy_id, legacy_ids, email, supabase_user_id, migrated')
    .limit(10);

  if (allUsers && allUsers.length > 0) {
    console.log(`\n📋 Available legacy users (first 10):`);
    allUsers.forEach(u => {
      console.log(`   - ID: ${u.legacy_id}, IDs: ${u.legacy_ids?.slice(0, 30)}..., Email: ${u.email}`);
    });
  } else {
    console.log(`\n⚠️  No legacy users found in the database!`);
    console.log(`   You need to import legacy users first.`);
  }

  // Also check profiles table for current logged-in user
  console.log(`\n🔍 Checking profiles table...`);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, username')
    .limit(5);

  if (profiles && profiles.length > 0) {
    console.log(`📋 Existing profiles:`);
    profiles.forEach(p => {
      console.log(`   - ${p.email} (ID: ${p.id})`);
    });
  }

  return null;
}

async function migrateProject() {
  console.log('🚀 Single Project Migration');
  console.log('============================\n');

  console.log('📦 Project to migrate:');
  console.log(`   ID: ${legacyProject.id}`);
  console.log(`   Title: ${legacyProject.title}`);
  console.log(`   Text: "${legacyProject.text}"`);
  console.log(`   Voice: ${legacyProject.voice_name} (${legacyProject.language_name})`);
  console.log(`   Engine: ${legacyProject.engine}`);

  // Find user
  let userId = await findUserByLegacyIds(legacyProject.user_ids);

  if (!userId) {
    // If no legacy user found, try to use the first profile (assuming it's your admin user)
    console.log(`\n💡 No legacy user mapping found.`);
    console.log(`   Would you like to assign this project to an existing user?`);
    
    const { data: firstProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .single();

    if (firstProfile) {
      console.log(`\n   Using admin user: ${firstProfile.email}`);
      userId = firstProfile.id;
    } else {
      console.log(`\n❌ No users available to assign the project to.`);
      console.log(`   Please login first to create a user.`);
      return;
    }
  }

  // Check if already migrated
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('legacy_id', legacyProject.id)
    .single();

  if (existing) {
    console.log(`\n⏭️  Project #${legacyProject.id} already migrated!`);
    return;
  }

  // Parse config
  let config = null;
  try {
    config = JSON.parse(legacyProject.config);
  } catch {
    config = { raw: legacyProject.config };
  }

  // Insert the project
  console.log(`\n⬆️  Inserting project...`);
  
  const { data: inserted, error } = await supabase.from('projects').insert({
    user_id: userId,
    legacy_id: legacyProject.id,
    legacy_ids: legacyProject.ids,
    legacy_user_ids: legacyProject.user_ids,
    title: legacyProject.title || 'Untitled Project',
    campaign: legacyProject.campaign || null,
    engine: legacyProject.engine || null,
    scheme: legacyProject.scheme || null,
    language_code: legacyProject.language_code || null,
    language_name: legacyProject.language_name || null,
    voice_id: legacyProject.voice_id || null,
    voice_name: legacyProject.voice_name || null,
    config: config,
    text_content: legacyProject.text || '',
    characters_count: legacyProject.characters_count || 0,
    storage: legacyProject.storage || null,
    audio_url: legacyProject.tts_uri || null, // Will need to update with full URL
    status: 'completed',
    is_legacy: true,
    created_at: legacyProject.created_time || new Date().toISOString(),
  }).select().single();

  if (error) {
    console.log(`❌ Failed to migrate: ${error.message}`);
    return;
  }

  console.log(`\n✅ Project migrated successfully!`);
  console.log(`   New ID: ${inserted.id}`);
  console.log(`   User ID: ${userId}`);
  console.log(`\n⚠️  Note: Audio file URL is set to relative path.`);
  console.log(`   You may need to update it with the full URL or migrate the file.`);
}

migrateProject().catch(console.error);











