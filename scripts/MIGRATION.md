# Legacy Data Migration Guide

## Overview

This guide explains how to migrate data from the legacy PHP/MySQL system to the new Next.js/Supabase platform.

## Legacy MySQL Tables

| Legacy Table | Description | New Table |
|--------------|-------------|-----------|
| `ait_user` | Users | `legacy_users` → `auth.users` + `profiles` |
| `ait_payment_subscription` | Subscriptions | `subscriptions` |
| `ait_payment_log` | Transaction history | (for reference only) |
| `ait_payment_purchased` | PAYG purchases | `usage_tracking` (payg fields) |
| `ait_statistics` | Usage statistics | `usage_tracking` |
| `ait_tts_log` | TTS Projects | `projects` + `project_audio` |

## Migration Order

⚠️ **IMPORTANT**: Migrate in this order:

1. **Users** (`ait_user`) - FIRST
2. **Subscriptions** (`ait_payment_subscription`) - AFTER users
3. **User Purchases** (`ait_payment_purchased`) - AFTER users  
4. **Payment History** (`ait_payment_log`) - AFTER users
5. **Projects** (`ait_tts_log`) - AFTER users
6. **Usage Stats** (`ait_statistics`) - AFTER users
7. **Audio Files** - AFTER projects (downloads from old storage)

### Quick Reference Commands

```bash
# 1. Users (creates Supabase Auth accounts with original passwords)
npx tsx scripts/migrate-users-full.ts

# 2. Subscriptions (active plans)
npx tsx scripts/migrate-legacy-subscriptions.ts

# 3. User Purchases (plan history including free users)
npx tsx scripts/migrate-user-purchases.ts

# 4. Payment History (transaction/invoice log)
npx tsx scripts/migrate-payment-history.ts

# 5. Projects
npx tsx scripts/migrate-legacy-projects.ts

# 6. Usage Stats
npx tsx scripts/migrate-legacy-usage.ts

# 7. Audio Files (downloads and re-uploads to Supabase Storage)
npx tsx scripts/migrate-audio-files.ts
```

---

## 1. Migrate Legacy Users

### Step 1: Export from MySQL

```sql
SELECT 
  id as legacy_id,
  ids as legacy_ids,
  username,
  email_address as email,
  password as password_hash,
  status,
  first_name,
  last_name,
  country,
  phone,
  role_ids,
  email_verified,
  affiliate_id,
  referred_by,
  created_time as legacy_created_time,
  update_time as legacy_updated_time
FROM ait_user
WHERE status = 1;  -- Only active users
```

Export to JSON and save as `scripts/data/legacy_users.json`

### Step 2: Run migration

```bash
npx tsx scripts/migrate-users-full.ts
```

This creates Supabase Auth accounts with original password hashes - users can login immediately!

---

## 2. Migrate Subscriptions

### Step 1: Export from MySQL

```sql
SELECT 
  id,
  ids,
  item_ids,
  user_ids,
  payment_gateway,
  gateway_identifier,
  gateway_auth_code,
  quantity,
  status,
  start_time,
  end_time,
  created_time,
  updated_time,
  description,
  stuff,
  used_up,
  auto_renew,
  stuff_voicelab
FROM ait_payment_subscription
```

Export to JSON and save as `scripts/data/legacy_subscriptions.json`

### Step 2: Run migration

```bash
npx tsx scripts/migrate-legacy-subscriptions.ts
```

### Status Mapping

| Legacy Status | New Status |
|--------------|------------|
| active, completed | active |
| cancelled, canceled | canceled |
| past_due, overdue | past_due |
| lifetime, one-time | lifetime |
| trialing, trial | trialing |

### Provider Mapping

| Legacy Gateway | New Provider |
|---------------|--------------|
| stripe | stripe |
| paypal | paypal_legacy |

---

## 3. Migrate Projects

### Step 1: Export from MySQL

```sql
SELECT 
  id,
  ids,
  user_ids,
  campaign,
  title,
  scheme,
  engine,
  language_code,
  language_name,
  voice_id,
  voice_name,
  config,
  text,
  characters_count,
  storage,
  tts_uri,
  created_time
FROM ait_tts_log
```

Export to JSON and save as `scripts/data/legacy_projects.json`

### Step 2: Run migration

```bash
npx tsx scripts/migrate-legacy-projects.ts
```

---

## 4. Migrate Audio Files to Supabase Storage

### Step 1: Test with dry run

```bash
npx tsx scripts/migrate-audio-files.ts --dry-run --limit=5
```

This will show what would be migrated without actually doing it.

### Step 2: Run full migration

```bash
npx tsx scripts/migrate-audio-files.ts
```

Or migrate in batches:

```bash
npx tsx scripts/migrate-audio-files.ts --limit=100
```

### What the script does:

1. Finds all legacy projects with old audio URLs
2. Downloads each audio file from the old location
3. Uploads to Supabase Storage (`project-audio` bucket)
4. Updates the `audio_url` in the database
5. Skips files already migrated to Supabase

### Storage structure:

```
project-audio/
  └── {user_id}/
      └── {legacy_id}_{timestamp}.mp3
```

---

## Data Mapping

### Users Table

| Legacy MySQL | Supabase |
|--------------|----------|
| id | legacy_id |
| ids | legacy_ids |
| email_address | email |
| password | password_hash |
| username | username |
| first_name | first_name |
| last_name | last_name |
| - | supabase_user_id (new) |
| - | migrated (new) |

### Projects Table

| Legacy MySQL | Supabase |
|--------------|----------|
| id | legacy_id |
| ids | legacy_ids |
| user_ids | legacy_user_ids |
| title | title |
| text | text_content |
| tts_uri | audio_url |
| config | config (parsed as JSONB) |
| - | user_id (UUID, linked to auth.users) |
| - | is_legacy (true) |

---

## Troubleshooting

### "User not found" errors

Make sure the user was migrated first. Check the `legacy_users` table:

```sql
SELECT * FROM legacy_users WHERE legacy_id = <user_ids>;
```

If `supabase_user_id` is NULL, the user hasn't logged in yet.

### Duplicate entries

The migration script skips projects that are already migrated (checks by `legacy_id`).

---

## 5. Migrate Usage Stats

### Step 1: Export from MySQL

```sql
SELECT 
  id,
  user_ids,
  payg_balance,
  payg_purchased,
  characters_preview_used,
  characters_production_used,
  voice_generated
FROM ait_statistics
```

Export to JSON and save as `scripts/data/legacy_usage.json`

### Step 2: Run migration

```bash
npx tsx scripts/migrate-legacy-usage.ts
```

### What gets migrated:

| Legacy Field | New Field |
|--------------|-----------|
| characters_preview_used | characters_preview_used |
| characters_production_used | characters_production_used |
| payg_balance | payg_balance |
| payg_purchased | payg_purchased |
| voice_generated | audio_files_generated |

---

## 6. Migrate Payment History (ait_payment_log)

This is the transaction/invoice log - useful for billing history and support.

### Step 1: Export from MySQL

```sql
SELECT * FROM ait_payment_log
```

Export to JSON and save as `scripts/data/legacy_payment_log.json`

### Step 2: Run migration

```bash
npx tsx scripts/migrate-payment-history.ts
```

### What gets migrated:

| Legacy Field | New Field |
|--------------|-----------|
| type | transaction_type |
| gateway | gateway (stripe/paypal) |
| amount | amount |
| item_name | item_name |
| redirect_status | redirect_status |
| callback_status | callback_status |
| stuff | metadata (JSON) |

---

## 7. Migrate User Purchases (ait_payment_purchased)

This tracks what plan each user has/had, including FREE plans. **Important for 40k+ users!**

### Step 1: Export from MySQL

```sql
SELECT * FROM ait_payment_purchased
```

Export to JSON and save as `scripts/data/legacy_payment_purchased.json`

### Step 2: Run migration

```bash
npx tsx scripts/migrate-user-purchases.ts
```

### What gets migrated:

| Legacy Field | New Field |
|--------------|-----------|
| item_name | item_name (Free Plan, Monthly Plan, etc.) |
| stuff.characters_limit | characters_limit |
| stuff.characters_used | characters_used |
| used_up | used_up |
| auto_renew | auto_renew |
| stuff_voicelab | voicelab_data (JSON) |

This also creates `usage_tracking` records for users with existing character usage.

---

## Post-Migration Checklist

- [ ] All legacy users imported to `legacy_users` table
- [ ] Test login with legacy credentials
- [ ] Subscriptions migrated with correct provider mapping
- [ ] Projects migrated with correct user association
- [ ] Audio files accessible
- [ ] Usage stats migrated (if applicable)
- [ ] Dashboard shows legacy projects

