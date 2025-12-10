/**
 * Import voices from CSV to Supabase
 * 
 * Usage:
 * 1. Place CSV file at scripts/data/voices.csv
 * 2. Run: npx ts-node scripts/import-voices.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface VoiceRow {
  id: string;
  ids: string;
  scheme: string;
  language_name: string;
  language_code: string;
  voice_id: string;
  engine: string;
  gender: string;
  name: string;
  description: string;
  enabled: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

async function importVoices() {
  const csvPath = path.join(__dirname, 'data', 'voices.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    console.log('Please copy the voices CSV to scripts/data/voices.csv');
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Skip header
  const header = parseCSVLine(lines[0]);
  console.log('CSV Headers:', header);
  
  const voices: VoiceRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 10) continue;
    
    voices.push({
      id: values[0],
      ids: values[1],
      scheme: values[2],
      language_name: values[3],
      language_code: values[4],
      voice_id: values[5],
      engine: values[6],
      gender: values[7],
      name: values[8],
      description: values[9],
      enabled: values[10],
    });
  }

  console.log(`Found ${voices.length} voices in CSV`);

  // Filter enabled voices only
  const enabledVoices = voices.filter(v => v.enabled === '1');
  console.log(`${enabledVoices.length} voices are enabled`);

  // Prepare for insert
  const voicesToInsert = enabledVoices.map(v => ({
    legacy_id: parseInt(v.id),
    legacy_ids: v.ids,
    provider: v.scheme, // 'azure'
    engine: v.engine,
    voice_id: v.voice_id,
    name: v.name,
    gender: v.gender || null,
    language_code: v.language_code,
    language_name: v.language_name,
    description: v.description || null,
    enabled: true,
  }));

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  
  for (let i = 0; i < voicesToInsert.length; i += batchSize) {
    const batch = voicesToInsert.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('voices')
      .upsert(batch, { 
        onConflict: 'provider,voice_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(voicesToInsert.length / batchSize)} (${inserted} voices)`);
    }
  }

  console.log(`\n✅ Import complete! ${inserted} voices imported.`);
}

// Also add some default ElevenLabs voices
async function addElevenLabsVoices() {
  const elevenLabsVoices = [
    { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female', language_code: 'en-US', language_name: 'English (US)' },
    { voice_id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male', language_code: 'en-US', language_name: 'English (US)' },
    { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', gender: 'Female', language_code: 'en-US', language_name: 'English (US)' },
    { voice_id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female', language_code: 'en-GB', language_name: 'English (UK)' },
    { voice_id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female', language_code: 'en-US', language_name: 'English (US)' },
    { voice_id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Male', language_code: 'en-GB', language_name: 'English (UK)' },
    { voice_id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male', language_code: 'en-US', language_name: 'English (US)' },
    { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'Male', language_code: 'en-US', language_name: 'English (US)' },
    { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male', language_code: 'en-GB', language_name: 'English (UK)' },
  ];

  const voicesToInsert = elevenLabsVoices.map(v => ({
    provider: 'elevenlabs',
    engine: 'neural',
    voice_id: v.voice_id,
    name: v.name,
    gender: v.gender,
    language_code: v.language_code,
    language_name: v.language_name,
    enabled: true,
  }));

  const { error } = await supabase
    .from('voices')
    .upsert(voicesToInsert, { 
      onConflict: 'provider,voice_id',
      ignoreDuplicates: false 
    });

  if (error) {
    console.error('Error inserting ElevenLabs voices:', error);
  } else {
    console.log(`✅ Added ${elevenLabsVoices.length} ElevenLabs voices`);
  }
}

async function main() {
  console.log('🎤 Importing TTS Voices...\n');
  
  await importVoices();
  await addElevenLabsVoices();
}

main().catch(console.error);

