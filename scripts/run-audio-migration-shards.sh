#!/bin/bash
set -euo pipefail

APP_DIR="/Users/juansanchez/Projects/Java Ventures/AITextSpeak"
LOG_DIR="$APP_DIR/scripts/logs"

mkdir -p "$LOG_DIR"
cd "$APP_DIR"

CONCURRENCY=${CONCURRENCY:-4}
# legacy_id max observed ~134882
RANGES=(
  "1 35000"
  "35001 70000"
  "70001 105000"
  "105001 140000"
)

TS="$(date +"%Y%m%d-%H%M%S")"

echo "🚀 Starting sharded audio migration at $(date)" 
echo "   Concurrency per shard: $CONCURRENCY"

i=0
for r in "${RANGES[@]}"; do
  i=$((i+1))
  START=$(echo "$r" | awk '{print $1}')
  END=$(echo "$r" | awk '{print $2}')

  LOG="$LOG_DIR/migrate-audio-with-structure-shard${i}-${START}-${END}-${TS}.log"

  nohup npx tsx scripts/migrate-audio-with-structure.ts \
    --concurrency=$CONCURRENCY \
    --start-legacy-id=$START \
    --end-legacy-id=$END \
    > "$LOG" 2>&1 &

  echo "   shard $i PID=$! range=$START..$END log=$(basename "$LOG")"
  sleep 1
done

echo "✅ All shards started. Logs in: $LOG_DIR" 




