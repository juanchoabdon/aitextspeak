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
 * npx tsx scripts/migrate-audio-with-structure.ts --concurrency=5
 * npx tsx scripts/migrate-audio-with-structure.ts --start-legacy-id=1 --end-legacy-id=30000 --concurrency=5
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
const concurrencyArg = args.find(a => a.startsWith('--concurrency='));
const concurrency = concurrencyArg ? Math.max(1, parseInt(concurrencyArg.split('=')[1])) : 3;
const startLegacyIdArg = args.find(a => a.startsWith('--start-legacy-id='));
const endLegacyIdArg = args.find(a => a.startsWith('--end-legacy-id='));
const startLegacyId = startLegacyIdArg ? Math.max(0, parseInt(startLegacyIdArg.split('=')[1])) : undefined;
const endLegacyId = endLegacyIdArg ? Math.max(0, parseInt(endLegacyIdArg.split('=')[1])) : undefined;

interface Project {
  id: string;
  legacy_id: number;
  audio_url: string;
  user_id: string;
  title: string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  maxConcurrency: number
): Promise<void> {
  let idx = 0;
  const runners = Array.from({ length: Math.min(maxConcurrency, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      await worker(items[i]);
    }
  });
  await Promise.allSettled(runners);
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { label: string; retries: number; baseDelayMs: number; maxDelayMs: number }
): Promise<T> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > opts.retries) throw err;
      const delay = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt - 1));
      console.log(`      ⚠️  ${opts.label} failed (attempt ${attempt}/${opts.retries}). Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function downloadFile(url: string): Promise<Buffer | null> {
  try {
    console.log(`   ⬇️  Downloading from: ${url}`);
    const response = await withRetry(
      () => fetch(url),
      { label: 'download fetch', retries: 3, baseDelayMs: 500, maxDelayMs: 8000 }
    );
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
  console.log(`⚙️  Concurrency: ${concurrency}`);
  if (startLegacyId !== undefined || endLegacyId !== undefined) {
    console.log(`⚙️  Legacy ID range: ${startLegacyId ?? '-inf'} .. ${endLegacyId ?? '+inf'}`);
  }
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No files will be uploaded\n');
  }

  // IMPORTANT: Supabase returns max 1000 rows by default.
  // We paginate using legacy_id to avoid skipping rows while we update audio_url.
  const PAGE_SIZE = 1000;
  let lastLegacyId = startLegacyId !== undefined ? Math.max(0, startLegacyId - 1) : 0;
  let remaining = limit; // optional global cap

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  while (true) {
    const queryFn = async () =>
      {
        let q = supabase
          .from('projects')
          .select('id, legacy_id, audio_url, user_id, title')
          .eq('is_legacy', true)
          .not('legacy_id', 'is', null)
          .not('audio_url', 'is', null)
          .not('audio_url', 'like', `${SUPABASE_URL}%`) // Skip already migrated
          .order('legacy_id', { ascending: true })
          .gt('legacy_id', lastLegacyId);

        if (startLegacyId !== undefined) {
          q = q.gte('legacy_id', startLegacyId);
        }
        if (endLegacyId !== undefined) {
          q = q.lte('legacy_id', endLegacyId);
        }

        return q.limit(remaining ? Math.min(PAGE_SIZE, remaining) : PAGE_SIZE);
      };

    const { data: projects, error } = await withRetry(
      queryFn,
      { label: 'fetch projects page', retries: 6, baseDelayMs: 1000, maxDelayMs: 30000 }
    );

    if (error) {
      console.error('❌ Error fetching projects:', error.message);
      console.log('   ⚠️  Will retry in 30s...');
      await sleep(30000);
      continue;
    }

    if (!projects || projects.length === 0) {
      break;
    }

    console.log(`📦 Found ${projects.length} audio files to migrate (starting after legacy_id=${lastLegacyId})\n`);

    const page = projects as Project[];
    // Advance cursor for pagination to the max in this page (even if some fail)
    const maxLegacyIdInPage = page.reduce((m, p) => Math.max(m, p.legacy_id || 0), lastLegacyId);
    lastLegacyId = Math.max(lastLegacyId, maxLegacyIdInPage);

    await runWithConcurrency(page, async (project) => {
    console.log(`\n🎵 Project: "${project.title?.slice(0, 40)}..." (legacy_id: ${project.legacy_id})`);
    console.log(`   Current path: ${project.audio_url}`);

    if (!project.audio_url) {
      console.log('   ⏭️  No audio URL, skipping');
      skipped++;
        return;
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
        return;
    }

    // Download the file
    const fileBuffer = await downloadFile(legacyFullUrl);

    if (!fileBuffer) {
      failed++;
        return;
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
      return;
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

    // Also update project_audio rows for this legacy project (UI reads from project_audio)
    const { error: audioUpdateError } = await supabase
      .from('project_audio')
      .update({ audio_url: newUrl })
      .eq('project_id', project.id)
      .not('audio_url', 'like', `${SUPABASE_URL}%`);

    if (audioUpdateError) {
      console.log(`   ⚠️  Failed to update project_audio: ${audioUpdateError.message}`);
    }

      console.log('   ✅ Migrated successfully!');
      migrated++;
    }, concurrency);

    if (remaining !== undefined) {
      remaining -= page.length;
      if (remaining <= 0) break;
    }

    if (remaining !== undefined && remaining <= 0) break;
    // If we received fewer than PAGE_SIZE, we likely reached the end
    if (projects.length < PAGE_SIZE) break;
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

