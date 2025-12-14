/**
 * Audio Files Migration Script
 * 
 * This script migrates audio files from the legacy storage to Supabase Storage.
 * 
 * PREREQUISITES:
 * 1. Projects must be already migrated to Supabase
 * 2. Legacy audio files must be accessible via their URLs
 * 
 * USAGE:
 * npx tsx scripts/migrate-audio-files.ts
 * 
 * OPTIONS:
 * --dry-run    : Only show what would be migrated, don't actually migrate
 * --limit=N    : Only migrate N files (useful for testing)
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
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`    ⚠️  Failed to download: ${response.status} ${response.statusText}`);
      return null;
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.log(`    ⚠️  Download error: ${error}`);
    return null;
  }
}

function getFileExtension(url: string): string {
  const urlPath = new URL(url).pathname;
  const ext = urlPath.split('.').pop()?.toLowerCase();
  return ext && ['mp3', 'wav', 'ogg', 'webm'].includes(ext) ? ext : 'mp3';
}

function getContentType(ext: string): string {
  const types: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
  };
  return types[ext] || 'audio/mpeg';
}

async function migrateAudioFiles() {
  console.log('🎵 Audio Files Migration Script');
  console.log('================================\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be uploaded\n');
  }

  // Get all legacy projects with audio URLs that haven't been migrated yet
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
    console.log(`\n🎵 Processing: "${project.title?.slice(0, 40)}..." (legacy_id: ${project.legacy_id})`);
    console.log(`   Old URL: ${project.audio_url?.slice(0, 60)}...`);

    if (!project.audio_url) {
      console.log('   ⏭️  No audio URL, skipping');
      skipped++;
      continue;
    }

    // Generate new filename: user_id/legacy_id_timestamp.ext
    const ext = getFileExtension(project.audio_url);
    const newFilename = `${project.user_id}/${project.legacy_id}_${Date.now()}.${ext}`;

    if (isDryRun) {
      console.log(`   📝 Would upload to: ${newFilename}`);
      migrated++;
      continue;
    }

    // Download the file
    console.log('   ⬇️  Downloading...');
    const fileBuffer = await downloadFile(project.audio_url);

    if (!fileBuffer) {
      failed++;
      continue;
    }

    console.log(`   📦 Downloaded ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Supabase Storage
    console.log('   ⬆️  Uploading to Supabase...');
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(newFilename, fileBuffer, {
        contentType: getContentType(ext),
        cacheControl: '31536000', // 1 year cache
      });

    if (uploadError) {
      console.log(`   ❌ Upload failed: ${uploadError.message}`);
      failed++;
      continue;
    }

    // Get the new public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(newFilename);

    const newUrl = urlData.publicUrl;
    console.log(`   🔗 New URL: ${newUrl.slice(0, 60)}...`);

    // Update the project with the new URL
    const { error: updateError } = await supabase
      .from('projects')
      .update({ audio_url: newUrl })
      .eq('id', project.id);

    if (updateError) {
      console.log(`   ⚠️  Failed to update project: ${updateError.message}`);
      // Still count as migrated since file is uploaded
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
}

migrateAudioFiles().catch(console.error);









