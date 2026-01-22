#!/bin/bash
set -euo pipefail

APP_DIR="/Users/juansanchez/Projects/Java Ventures/AITextSpeak"
LOG_DIR="$APP_DIR/scripts/logs"

TS="$(date +"%Y%m%d-%H%M%S")"

PROJECTS_LOG="$LOG_DIR/migrate-projects-$TS.log"
AUDIO_DRY_LOG="$LOG_DIR/migrate-audio-dryrun-$TS.log"
AUDIO_LOG="$LOG_DIR/migrate-audio-$TS.log"

cd "$APP_DIR"

echo "🚀 Starting projects + audio migration: $(date)" | tee -a "$PROJECTS_LOG"

# 1) Projects (DB) migration
echo "\n=== (1/3) Migrating projects to DB ===" | tee -a "$PROJECTS_LOG"
npx tsx scripts/migrate-projects.ts 2>&1 | tee -a "$PROJECTS_LOG"

echo "\n✅ Projects migration finished: $(date)" | tee -a "$PROJECTS_LOG"

# 2) Audio dry run (quick sanity check)
echo "\n=== (2/3) Audio migration DRY RUN (limit=5) ===" | tee -a "$AUDIO_DRY_LOG"
npx tsx scripts/migrate-audio-with-structure.ts --dry-run --limit=5 2>&1 | tee -a "$AUDIO_DRY_LOG"

echo "\n✅ Audio dry run finished: $(date)" | tee -a "$AUDIO_DRY_LOG"

# 3) Audio migration (Storage)
echo "\n=== (3/3) Migrating audio files to Supabase Storage ===" | tee -a "$AUDIO_LOG"
npx tsx scripts/migrate-audio-with-structure.ts 2>&1 | tee -a "$AUDIO_LOG"

echo "\n🎉 All done: $(date)" | tee -a "$AUDIO_LOG"






