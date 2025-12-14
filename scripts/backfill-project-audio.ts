/**
 * Backfill `project_audio` for legacy migrated projects.
 *
 * Why: legacy migration initially populated `projects`, but the app reads audio files
 * from `project_audio`.
 *
 * Run with:
 *   npx tsx scripts/backfill-project-audio.ts
 *
 * Options:
 *   --start-legacy-id=N  (default: 0)
 *   --end-legacy-id=N    (default: none)
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

// Keep this relatively small to avoid request-size limits on `.in(...)`
const PAGE_SIZE = 200;

// Parse CLI range options (useful for targeted retries)
const args = process.argv.slice(2);
const startLegacyIdArg = args.find(a => a.startsWith('--start-legacy-id='));
const endLegacyIdArg = args.find(a => a.startsWith('--end-legacy-id='));
const startLegacyId = startLegacyIdArg ? Math.max(0, parseInt(startLegacyIdArg.split('=')[1])) : 0;
const endLegacyId = endLegacyIdArg ? Math.max(0, parseInt(endLegacyIdArg.split('=')[1])) : undefined;

type ProjectRow = {
  id: string;
  legacy_id: number | null;
  title: string | null;
  text_content: string | null;
  audio_url: string | null;
  voice_id: string | null;
  voice_name: string | null;
  language_code: string | null;
  scheme: string | null;
  engine: string | null;
  characters_count: number | null;
};

function deriveProvider(p: ProjectRow): string {
  const s = (p.scheme || '').trim();
  if (s) return s;
  const e = (p.engine || '').trim();
  if (e) return e;
  return 'azure';
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { label: string; retries: number; baseDelayMs: number; maxDelayMs: number }
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > opts.retries) throw err;
      const delay = Math.min(opts.maxDelayMs, opts.baseDelayMs * Math.pow(2, attempt - 1));
      console.log(`   ⚠️  ${opts.label} failed (attempt ${attempt}/${opts.retries}). Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
}

async function backfill() {
  console.log('🔁 Backfilling project_audio from legacy projects...\n');
  if (startLegacyId || endLegacyId !== undefined) {
    console.log(`🎯 Range: legacy_id ${startLegacyId} .. ${endLegacyId ?? '+inf'}\n`);
  }

  // Count total legacy projects
  const totalResult = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('is_legacy', true)
    .not('legacy_id', 'is', null)
    .gte('legacy_id', startLegacyId)
    .lte('legacy_id', endLegacyId ?? 999999999);

  const total = totalResult.count || 0;
  console.log(`📦 Legacy projects found: ${total}`);

  // Keyset pagination (avoid OFFSET scans / statement timeouts).
  // All legacy projects have legacy_id populated by our migration.
  let lastLegacyId = Math.max(0, startLegacyId - 1);
  let processed = 0;
  let inserted = 0;
  let alreadyHadAudio = 0;
  let skippedNoAudioUrl = 0;
  let skippedNoVoice = 0;
  let failed = 0;

  while (true) {
    const { data: projects, error } = await withRetry(
      async () =>
        await supabase
          .from('projects')
          .select('id,legacy_id,title,text_content,audio_url,voice_id,voice_name,language_code,scheme,engine,characters_count')
          .eq('is_legacy', true)
          .not('legacy_id', 'is', null)
          .order('legacy_id', { ascending: true })
          .gt('legacy_id', lastLegacyId)
          .lte('legacy_id', endLegacyId ?? 999999999)
          .limit(PAGE_SIZE),
      { label: 'fetch projects page', retries: 6, baseDelayMs: 750, maxDelayMs: 30000 }
    );

    if (error) {
      console.error('❌ Error fetching projects:', error.message);
      // If Supabase returns a transient error, retry loop above should handle it.
      // If we still got an error, pause a bit and continue.
      await sleep(5000);
      continue;
    }

    const batch = (projects || []) as ProjectRow[];
    if (batch.length === 0) break;

    // Advance cursor regardless of insert success so we don't get stuck
    const maxLegacyIdInBatch = batch.reduce((m, p) => Math.max(m, p.legacy_id || 0), lastLegacyId);
    lastLegacyId = Math.max(lastLegacyId, maxLegacyIdInBatch);
    processed += batch.length;

    const projectIds = batch.map(p => p.id);

    // Existing audio rows for these projects
    const { data: existingAudio, error: existingErr } = await withRetry(
      async () =>
        await supabase
          .from('project_audio')
          .select('project_id')
          .in('project_id', projectIds),
      { label: 'fetch existing project_audio', retries: 6, baseDelayMs: 750, maxDelayMs: 30000 }
    );

    if (existingErr) {
      console.error('❌ Error fetching existing project_audio:', existingErr.message);
      await sleep(5000);
      continue;
    }

    const existingSet = new Set<string>((existingAudio || []).map((a: { project_id: string }) => a.project_id));

    const toInsert: Array<Record<string, unknown>> = [];

    for (const p of batch) {
      if (existingSet.has(p.id)) {
        alreadyHadAudio++;
        continue;
      }
      if (!p.audio_url) {
        skippedNoAudioUrl++;
        continue;
      }
      if (!p.voice_id) {
        skippedNoVoice++;
        continue;
      }

      toInsert.push({
        project_id: p.id,
        title: p.title || null,
        text_content: p.text_content || '',
        audio_url: p.audio_url,
        voice_id: p.voice_id,
        voice_name: p.voice_name || null,
        language_code: p.language_code || null,
        provider: deriveProvider(p),
        characters_count: p.characters_count || 0,
        sort_order: 1,
      });
    }

    if (toInsert.length > 0) {
      const { error: insertErr } = await withRetry(
        async () =>
          await supabase
            .from('project_audio')
            .insert(toInsert),
        { label: 'insert project_audio batch', retries: 6, baseDelayMs: 750, maxDelayMs: 30000 }
      );

      if (insertErr) {
        console.error(`\n❌ Insert error after legacy_id=${lastLegacyId}:`, insertErr.message);
        failed += toInsert.length;
      } else {
        inserted += toInsert.length;
      }
    }

    const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
    process.stdout.write(
      `\r⏳ ${processed}/${total} (${pct}%) | inserted=${inserted} | alreadyHadAudio=${alreadyHadAudio} | skippedNoAudioUrl=${skippedNoAudioUrl} | skippedNoVoice=${skippedNoVoice} | failed=${failed} | lastLegacyId=${lastLegacyId}`
    );
  }

  console.log('\n\n✅ Backfill finished');
  console.log(`   inserted: ${inserted}`);
  console.log(`   alreadyHadAudio: ${alreadyHadAudio}`);
  console.log(`   skippedNoAudioUrl: ${skippedNoAudioUrl}`);
  console.log(`   skippedNoVoice: ${skippedNoVoice}`);
  console.log(`   failed: ${failed}`);
}

backfill().catch(err => {
  console.error(err);
  process.exit(1);
});




