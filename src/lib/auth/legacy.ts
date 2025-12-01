import bcrypt from 'bcryptjs';
import { createAdminClient } from '@/lib/supabase/server';
import type { LegacyUser, Profile } from '@/types/database';

/**
 * Verifies a password against a legacy bcrypt hash
 * Supports $2y$ prefix used by PHP's password_hash()
 * 
 * @param plainPassword - The password entered by the user
 * @param hash - The bcrypt hash from legacy system ($2y$12$...)
 * @returns Promise<boolean> - Whether the password matches
 */
export async function verifyLegacyPassword(
  plainPassword: string,
  hash: string
): Promise<boolean> {
  // bcryptjs handles $2y$ hashes (PHP) as $2a$ automatically
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Finds a legacy user by email
 * 
 * @param email - The email to search for
 * @returns The legacy user or null if not found
 */
export async function findLegacyUserByEmail(
  email: string
): Promise<LegacyUser | null> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('legacy_users')
    .select('*')
    .eq('email', email.toLowerCase())
    .eq('migrated', false)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data as LegacyUser;
}

/**
 * Creates a new Supabase Auth user from a legacy user
 * 
 * @param email - User's email
 * @param password - The plaintext password (to create new hash)
 * @returns The created user or error
 */
export async function createSupabaseUser(
  email: string,
  password: string
): Promise<{ user: { id: string; email: string } | null; error: string | null }> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm since they were verified in legacy system
  });
  
  if (error) {
    console.error('Error creating Supabase user:', error);
    return { user: null, error: error.message };
  }
  
  return { 
    user: data.user ? { id: data.user.id, email: data.user.email! } : null, 
    error: null 
  };
}

/**
 * Updates the legacy user record to mark as migrated
 * 
 * @param legacyId - The legacy user ID
 * @param supabaseUserId - The new Supabase user ID
 */
export async function markLegacyUserAsMigrated(
  legacyId: number,
  supabaseUserId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('legacy_users')
    .update({
      migrated: true,
      migrated_at: new Date().toISOString(),
      supabase_user_id: supabaseUserId,
    })
    .eq('legacy_id', legacyId);
  
  if (error) {
    console.error('Error marking legacy user as migrated:', error);
    return false;
  }
  
  return true;
}

/**
 * Updates the profile with legacy user data
 * 
 * @param supabaseUserId - The Supabase user ID
 * @param legacyUser - The legacy user data
 */
export async function updateProfileFromLegacy(
  supabaseUserId: string,
  legacyUser: LegacyUser
): Promise<boolean> {
  const supabase = createAdminClient();
  
  const profileUpdate: Partial<Profile> = {
    username: legacyUser.username,
    first_name: legacyUser.first_name,
    last_name: legacyUser.last_name,
    country: legacyUser.country,
    phone: legacyUser.phone,
    is_legacy_user: true,
    legacy_user_id: legacyUser.legacy_id,
    email_verified: legacyUser.email_verified,
  };
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update(profileUpdate)
    .eq('id', supabaseUserId);
  
  if (error) {
    console.error('Error updating profile from legacy:', error);
    return false;
  }
  
  return true;
}

/**
 * Full legacy user migration flow
 * 
 * 1. Verify password against legacy hash
 * 2. Create Supabase Auth user
 * 3. Update profile with legacy data
 * 4. Mark legacy user as migrated
 * 
 * @param email - User's email
 * @param password - User's plaintext password
 * @returns Migration result
 */
export async function migrateLegacyUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  // Step 1: Find the legacy user
  const legacyUser = await findLegacyUserByEmail(email);
  
  if (!legacyUser) {
    return { success: false, error: 'User not found' };
  }
  
  // Step 2: Verify password
  const passwordValid = await verifyLegacyPassword(password, legacyUser.password_hash);
  
  if (!passwordValid) {
    return { success: false, error: 'Invalid credentials' };
  }
  
  // Step 3: Create Supabase Auth user
  const { user, error: createError } = await createSupabaseUser(email, password);
  
  if (createError || !user) {
    return { success: false, error: createError || 'Failed to create user' };
  }
  
  // Step 4: Update profile with legacy data
  await updateProfileFromLegacy(user.id, legacyUser);
  
  // Step 5: Mark legacy user as migrated
  await markLegacyUserAsMigrated(legacyUser.legacy_id, user.id);
  
  return { success: true, userId: user.id };
}

/**
 * Migrate legacy subscriptions for a user
 * This should be called after successful migration
 * 
 * @param supabaseUserId - The new Supabase user ID
 * @param subscriptionData - Legacy subscription data to migrate
 */
export async function migrateLegacySubscription(
  supabaseUserId: string,
  subscriptionData: {
    provider: 'stripe' | 'paypal_legacy';
    subscriptionId: string;
    customerId?: string;
    status: string;
    currentPeriodEnd?: Date;
  }
): Promise<boolean> {
  const supabase = createAdminClient();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from('subscriptions').insert({
    user_id: supabaseUserId,
    provider: subscriptionData.provider,
    provider_subscription_id: subscriptionData.subscriptionId,
    provider_customer_id: subscriptionData.customerId || null,
    status: subscriptionData.status,
    current_period_end: subscriptionData.currentPeriodEnd?.toISOString() || null,
    is_legacy: true,
    legacy_data: subscriptionData,
  });
  
  if (error) {
    console.error('Error migrating subscription:', error);
    return false;
  }
  
  return true;
}
