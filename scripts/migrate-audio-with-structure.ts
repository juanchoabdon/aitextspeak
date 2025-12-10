/**
 * Audio Files Migration Script (Preserving Structure)
 * 
 * This script migrates audio files from the legacy server to Supabase Storage
 * while preserving the original path structure: /tts_file/user/{filename}.mp3
 * 
 * CONFIGURATION:
 * Set LEGACY_BASE_URL to your old server's base URL
 * 
 * USAGE:
 * npx tsx scripts/migrate-audio-with-structure.ts
 * npx tsx scripts/migrate-audio-with-structure.ts --dry-run
 * npx tsx scripts/migrate-audio-with-structure.ts --limit=5
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================
// CONFIGURATION
// ============================================
const LEGACY_BASE_URL = 'https://app.aitextspeak.com';
// ============================================

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

const BUCKET_NAME = 'project-audio';
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

interface Project {
  id: string;
  legacy_id: number;
  audio_url: string;
  user_id: string;
  title: string;
}

async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    console.log(`   ⬇️  Downloading from: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`      ⚠️  Failed: ${response.status} ${response.statusText}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.log(`      ⚠️  Download error: ${error}`);
    return null;
  }
}

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
  };
  return types[ext || 'mp3'] || 'audio/mpeg';
}

async function migrateAudioFiles() {
  console.log('🎵 Audio Files Migration (Preserving Structure)');
  console.log('================================================\n');
  console.log(`📍 Legacy server: ${LEGACY_BASE_URL}`);
  console.log(`📍 Supabase bucket: ${BUCKET_NAME}\n`);
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be uploaded\n');
  }

  // Get all projects with legacy audio URLs (not yet migrated to Supabase)
  let query = supabase
    .from('projects')
    .select('id, legacy_id, audio_url, user_id, title')
    .eq('is_legacy', true)
    .not('audio_url', 'is', null)
    .not('audio_url', 'like', `${SUPABASE_URL}%`); // Skip already migrated

  if (limit) {
    query = query.limit(limit);
  }

  const { data: projects, error } = await query;

  if (error) {
    console.error('❌ Error fetching projects:', error.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('✅ No audio files to migrate!');
    return;
  }

  console.log(`📦 Found ${projects.length} audio files to migrate\n`);

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const project of projects as Project[]) {
    console.log(`\n🎵 Project: "${project.title?.slice(0, 40)}..." (legacy_id: ${project.legacy_id})`);
    console.log(`   Current path: ${project.audio_url}`);

    if (!project.audio_url) {
      console.log('   ⏭️  No audio URL, skipping');
      skipped++;
      continue;
    }

    // The audio_url is a relative path like: tts_file/user/xxx.mp3
    // We preserve this structure in Supabase Storage
    const relativePath = project.audio_url.startsWith('/') 
      ? project.audio_url.slice(1) 
      : project.audio_url;
    
    // Full URL to download from legacy server
    const legacyFullUrl = `${LEGACY_BASE_URL}/${relativePath}`;
    
    // Path in Supabase Storage (same structure)
    const storagePath = relativePath;

    console.log(`   📁 Storage path: ${storagePath}`);

    if (isDryRun) {
      console.log(`   📝 Would download from: ${legacyFullUrl}`);
      console.log(`   📝 Would upload to: ${BUCKET_NAME}/${storagePath}`);
      migrated++;
      continue;
    }

    // Download the file
    const fileBuffer = await downloadFile(legacyFullUrl);

    if (!fileBuffer) {
      failed++;
      continue;
    }

    console.log(`   📦 Downloaded ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    // Upload to Supabase Storage with same path structure
    console.log('   ⬆️  Uploading to Supabase...');
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType: getContentType(storagePath),
        cacheControl: '31536000', // 1 year cache
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.log(`   ❌ Upload failed: ${uploadError.message}`);
      failed++;
      continue;
    }

    // Get the new public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const newUrl = urlData.publicUrl;
    console.log(`   🔗 New URL: ${newUrl}`);

    // Update the project with the new URL
    const { error: updateError } = await supabase
      .from('projects')
      .update({ audio_url: newUrl })
      .eq('id', project.id);

    if (updateError) {
      console.log(`   ⚠️  Failed to update project: ${updateError.message}`);
    }

    console.log('   ✅ Migrated successfully!');
    migrated++;
  }

  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Migrated: ${migrated}`);
  console.log(`   ⏭️  Skipped:  ${skipped}`);
  console.log(`   ❌ Failed:   ${failed}`);
  console.log('========================================\n');

  if (isDryRun) {
    console.log('💡 This was a dry run. Run without --dry-run to actually migrate files.\n');
  }

  // Show the new URL structure
  console.log('📁 New URL structure in Supabase:');
  console.log(`   ${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/tts_file/user/{filename}.mp3`);
}

migrateAudioFiles().catch(console.error);

