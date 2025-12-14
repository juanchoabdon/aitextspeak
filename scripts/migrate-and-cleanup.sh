#!/bin/bash

cd "/Users/juansanchez/Projects/Java Ventures/AITextSpeak"

echo "🚀 Starting migration at $(date)"
echo "================================"

# Run the migration
npx tsx scripts/migrate-users-fast.ts 2>&1 | tee migration_output.log

echo ""
echo "================================"
echo "🧹 Running cleanup at $(date)"
echo "================================"

# Cleanup: Fix any remaining non-legacy profiles
node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) envVars[key.trim()] = valueParts.join('=').trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const legacyUsers = JSON.parse(fs.readFileSync('scripts/data/legacy_users.json', 'utf-8'));
const legacyByEmail = new Map();
legacyUsers.forEach(u => {
  const email = (u.email_address || '').toLowerCase().trim();
  if (email) legacyByEmail.set(email, u);
});

async function cleanup() {
  console.log('Fixing non-legacy profiles...');
  
  const { data: nonLegacy } = await supabase.from('profiles').select('id, email').eq('is_legacy_user', false);
  let fixed = 0;
  
  for (const p of nonLegacy || []) {
    const legacy = legacyByEmail.get(p.email.toLowerCase());
    if (legacy) {
      await supabase.from('profiles').update({ is_legacy_user: true, legacy_user_id: Number(legacy.id) }).eq('id', p.id);
      await supabase.from('legacy_users').upsert({ legacy_id: Number(legacy.id), email: p.email, migrated: true, supabase_user_id: p.id }, { onConflict: 'legacy_id' });
      fixed++;
    }
  }
  
  console.log('Fixed:', fixed, 'profiles');
  
  // Final counts
  const r1 = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_legacy_user', true);
  const r2 = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_legacy_user', false);
  const r3 = await supabase.from('legacy_users').select('legacy_id', { count: 'exact', head: true }).eq('migrated', true);
  
  console.log('');
  console.log('📊 FINAL RESULTS:');
  console.log('  Legacy users (is_legacy_user=true):', r1.count);
  console.log('  Non-legacy (is_legacy_user=false):', r2.count);
  console.log('  Legacy users migrated:', r3.count);
}

cleanup();
"

echo ""
echo "✅ Migration completed at $(date)"






