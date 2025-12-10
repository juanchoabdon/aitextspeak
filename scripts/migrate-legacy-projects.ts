/**
 * Legacy Projects Migration Script
 * 
 * This script migrates projects from the legacy MySQL database to Supabase.
 * 
 * PREREQUISITES:
 * 1. Export your legacy MySQL projects table to a JSON file
 * 2. Ensure all legacy users have been migrated (legacy_users.migrated = true)
 * 
 * USAGE:
 * 1. Export MySQL data: 
 *    mysql -u user -p database -e "SELECT * FROM projects" > legacy_projects.json
 *    OR use a tool like DBeaver to export to JSON
 * 
 * 2. Place the JSON file at: scripts/data/legacy_projects.json
 * 
 * 3. Run: npx tsx scripts/migrate-legacy-projects.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
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

interface LegacyProject {
  id: number;
  ids: string;
  user_ids: string;
  campaign: string;
  title: string;
  scheme: string;
  engine: string;
  language_code: string;
  language_name: string;
  voice_id: string;
  voice_name: string;
  config: string;
  text: string;
  characters_count: number;
  storage: string;
  tts_uri: string;
  created_time: string;
}

async function getUserIdFromLegacyId(legacyUserIds: string): Promise<string | null> {
  // The legacy user_ids might be a comma-separated list or a single ID
  // We need to find the corresponding Supabase user
  const legacyId = legacyUserIds.split(',')[0].trim();
  
  const { data, error } = await supabase
    .from('legacy_users')
    .select('supabase_user_id')
    .eq('legacy_id', parseInt(legacyId))
    .single();
  
  if (error || !data?.supabase_user_id) {
    // Try matching by 'ids' field
    const { data: dataByIds } = await supabase
      .from('legacy_users')
      .select('supabase_user_id')
      .eq('legacy_ids', legacyUserIds)
      .single();
    
    return dataByIds?.supabase_user_id || null;
  }
  
  return data.supabase_user_id;
}

function parseConfig(configStr: string): Record<string, unknown> | null {
  if (!configStr) return null;
  try {
    return JSON.parse(configStr);
  } catch {
    // If it's not valid JSON, store as-is in a wrapper
    return { raw: configStr };
  }
}

async function migrateProjects() {
  const dataPath = resolve(process.cwd(), 'scripts/data/legacy_projects.json');
  
  if (!existsSync(dataPath)) {
    console.log('❌ No legacy projects file found!');
    console.log('');
    console.log('Please export your legacy projects from MySQL and save to:');
    console.log(`  ${dataPath}`);
    console.log('');
    console.log('Expected JSON format:');
    console.log('[');
    console.log('  {');
    console.log('    "id": 1,');
    console.log('    "ids": "abc123",');
    console.log('    "user_ids": "5",');
    console.log('    "title": "My Project",');
    console.log('    "text": "Hello world",');
    console.log('    ...');
    console.log('  }');
    console.log(']');
    return;
  }

  console.log('🚀 Starting legacy projects migration...\n');

  const rawData = readFileSync(dataPath, 'utf-8');
  const legacyProjects: LegacyProject[] = JSON.parse(rawData);

  console.log(`📦 Found ${legacyProjects.length} projects to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const project of legacyProjects) {
    // Check if already migrated
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('legacy_id', project.id)
      .single();

    if (existing) {
      console.log(`⏭️  Skipping project #${project.id} - already migrated`);
      skipped++;
      continue;
    }

    // Find the Supabase user ID
    const userId = await getUserIdFromLegacyId(project.user_ids);

    if (!userId) {
      console.log(`⚠️  Skipping project #${project.id} - user not found (legacy_user_ids: ${project.user_ids})`);
      failed++;
      continue;
    }

    // Insert the project
    const { error } = await supabase.from('projects').insert({
      user_id: userId,
      legacy_id: project.id,
      legacy_ids: project.ids,
      legacy_user_ids: project.user_ids,
      title: project.title || 'Untitled Project',
      campaign: project.campaign || null,
      engine: project.engine || null,
      scheme: project.scheme || null,
      language_code: project.language_code || null,
      language_name: project.language_name || null,
      voice_id: project.voice_id || null,
      voice_name: project.voice_name || null,
      config: parseConfig(project.config),
      text_content: project.text || '',
      characters_count: project.characters_count || 0,
      storage: project.storage || null,
      audio_url: project.tts_uri || null,
      status: 'completed',
      is_legacy: true,
      created_at: project.created_time || new Date().toISOString(),
    });

    if (error) {
      console.log(`❌ Failed to migrate project #${project.id}: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ Migrated project #${project.id}: "${project.title?.slice(0, 50)}..."`);
      migrated++;
    }
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log('========================================\n');
}

migrateProjects().catch(console.error);



