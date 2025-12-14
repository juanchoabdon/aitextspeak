/**
 * Migrate Legacy TTS Log (Projects) to projects table
 * 
 * Run with: npx tsx scripts/migrate-projects.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface LegacyProject {
  id: string;
  ids: string;
  user_ids: string;
  campaign: string | null;
  title: string;
  scheme: string;
  engine: string;
  language_code: string;
  language_name: string;
  voice_id: string;
  voice_name: string;
  config: string;
  text: string;
  characters_count: string;
  storage: string;
  tts_uri: string;
  created_time: string;
}

const BATCH_SIZE = 200;

async function loadLegacyUserMap(): Promise<Map<string, string>> {
  console.log('📋 Loading legacy users mapping...');
  const map = new Map<string, string>();
  
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data: legacyUsers, error } = await supabase
      .from('legacy_users')
      .select('legacy_ids, supabase_user_id')
      .not('supabase_user_id', 'is', null)
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Error loading legacy users:', error);
      break;
    }
    
    if (!legacyUsers || legacyUsers.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const user of legacyUsers) {
      if (user.legacy_ids && user.supabase_user_id) {
        map.set(user.legacy_ids, user.supabase_user_id);
      }
    }
    
    offset += pageSize;
    if (legacyUsers.length < pageSize) {
      hasMore = false;
    }
  }
  
  console.log(`   Found ${map.size} legacy users with Supabase IDs\n`);
  return map;
}

async function getExistingProjects(): Promise<Set<number>> {
  console.log('📋 Loading existing migrated projects...');
  const existingIds = new Set<number>();
  
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase
      .from('projects')
      .select('legacy_id')
      .not('legacy_id', 'is', null)
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('Error loading existing projects:', error);
      break;
    }
    
    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }
    
    for (const project of data) {
      if (project.legacy_id) {
        existingIds.add(project.legacy_id);
      }
    }
    
    offset += pageSize;
    if (data.length < pageSize) {
      hasMore = false;
    }
  }
  
  console.log(`   Found ${existingIds.size} already migrated projects\n`);
  return existingIds;
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr || dateStr === '0000-00-00 00:00:00' || dateStr === 'null') {
    return null;
  }
  try {
    const date = new Date(dateStr.replace(' ', 'T') + 'Z');
    return date.toISOString();
  } catch {
    return null;
  }
}

function parseConfig(configStr: string): Record<string, unknown> | null {
  if (!configStr) return null;
  try {
    return JSON.parse(configStr);
  } catch {
    return null;
  }
}

async function migrateProjects() {
  console.log('🚀 Starting Projects Migration\n');
  console.log('='.repeat(50));
  
  // Load legacy projects
  const projectsPath = path.join(process.cwd(), 'scripts/data/AIT TTS Log.json');
  const projectsData = fs.readFileSync(projectsPath, 'utf-8');
  const legacyProjects: LegacyProject[] = JSON.parse(projectsData);
  
  console.log(`📦 Found ${legacyProjects.length} legacy projects to process\n`);
  
  // Load user mapping
  const userMap = await loadLegacyUserMap();
  
  // Get already migrated projects
  const existingProjects = await getExistingProjects();
  
  // Filter out already migrated
  const toMigrate = legacyProjects.filter(p => !existingProjects.has(Number(p.id)));
  console.log(`📋 ${toMigrate.length} projects to migrate (${existingProjects.size} already done)\n`);
  
  if (toMigrate.length === 0) {
    console.log('✅ All projects already migrated!');
    return;
  }
  
  let migrated = 0;
  let skipped = 0;
  let failed = 0;
  
  // Process in batches
  for (let i = 0; i < toMigrate.length; i += BATCH_SIZE) {
    const batch = toMigrate.slice(i, i + BATCH_SIZE);
    const records = [];
    
    for (const project of batch) {
      const supabaseUserId = userMap.get(project.user_ids);
      
      if (!supabaseUserId) {
        skipped++;
        continue;
      }
      
      records.push({
        user_id: supabaseUserId,
        legacy_id: Number(project.id),
        legacy_ids: project.ids,
        legacy_user_ids: project.user_ids,
        title: project.title || 'Untitled',
        campaign: project.campaign || null,
        engine: project.engine || null,
        scheme: project.scheme || null,
        language_code: project.language_code || null,
        language_name: project.language_name || null,
        voice_id: project.voice_id || null,
        voice_name: project.voice_name || null,
        config: parseConfig(project.config),
        text_content: project.text || '',
        characters_count: parseInt(project.characters_count) || 0,
        storage: project.storage || null,
        audio_url: project.tts_uri || null,
        status: 'completed',
        is_legacy: true,
        created_at: parseDate(project.created_time),
      });
    }
    
    if (records.length > 0) {
      const { error } = await supabase
        .from('projects')
        .insert(records);
      
      if (error) {
        console.error(`\n❌ Batch error at ${i}:`, error.message);
        failed += records.length;
      } else {
        migrated += records.length;
      }
    }
    
    // Progress update
    const progress = Math.min(i + BATCH_SIZE, toMigrate.length);
    const percent = Math.round((progress / toMigrate.length) * 100);
    process.stdout.write(`\r⏳ Progress: ${progress}/${toMigrate.length} (${percent}%) - Migrated: ${migrated}, Skipped: ${skipped}, Failed: ${failed}`);
  }
  
  console.log('\n');
  console.log('='.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⚠️  Skipped (no user): ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

migrateProjects().catch(console.error);




