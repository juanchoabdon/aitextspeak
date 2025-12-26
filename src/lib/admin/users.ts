'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export interface UserListItem {
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_legacy_user: boolean;
  created_at: string;
  billing_provider?: 'stripe' | 'paypal' | 'paypal_legacy' | 'free';
}

export interface PaginatedUsersResult {
  users: UserListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserDetailData {
  // Profile info
  id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_legacy_user: boolean;
  created_at: string;
  
  // Subscription info
  subscription: {
    status: string;
    plan_id: string | null;
    plan_name: string | null;
    provider: string;
    current_period_start: string | null;
    current_period_end: string | null;
    is_legacy: boolean;
    price_amount: number | null;
    billing_interval: string | null;
  } | null;
  
  // Usage stats
  projectsCount: number;
  audioCount: number;
  
  // Character usage
  charactersUsed: number;
  charactersLimit: number | null; // null means unlimited
  
  // Transactions
  transactions: {
    id: string;
    transaction_type: string;
    amount: number;
    currency: string;
    gateway: string;
    item_name: string | null;
    created_at: string;
    redirect_status: string | null;
  }[];
}

/**
 * Fetch paginated users with optional search
 */
export async function getPaginatedUsers(
  page: number = 1,
  pageSize: number = 20,
  search: string = ''
): Promise<PaginatedUsersResult> {
  noStore();
  
  const supabase = createAdminClient();
  const offset = (page - 1) * pageSize;
  
  // Build base query
  let query = supabase
    .from('profiles')
    .select('id, email, username, first_name, last_name, role, is_legacy_user, created_at', { count: 'exact' });
  
  // Apply search filter
  if (search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},username.ilike.${searchTerm}`);
  }
  
  // Apply pagination and ordering
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching users:', error);
    return {
      users: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const users = (data || []) as UserListItem[];
  const totalCount = count || 0;
  const userIds = users.map(u => u.id);

  // Fetch subscriptions for these users
  if (userIds.length > 0) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('user_id, provider, status, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false });

    const activeProviderByUser = new Map<string, UserListItem['billing_provider']>();
    const recentProviderByUser = new Map<string, UserListItem['billing_provider']>();

    for (const sub of subs || []) {
      const provider = (sub.provider as UserListItem['billing_provider']) || undefined;
      const status = (sub.status as string | null) || null;
      if (!provider) continue;

      if (!recentProviderByUser.has(sub.user_id)) {
        recentProviderByUser.set(sub.user_id, provider);
      }
      if (status === 'active' && !activeProviderByUser.has(sub.user_id)) {
        activeProviderByUser.set(sub.user_id, provider);
      }
    }

    for (const u of users) {
      u.billing_provider = activeProviderByUser.get(u.id) || recentProviderByUser.get(u.id) || 'free';
    }
  }

  return {
    users,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Get detailed information about a specific user
 */
export async function getUserDetail(userId: string): Promise<UserDetailData | null> {
  noStore();
  
  const supabase = createAdminClient();
  
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (profileError || !profile) {
    console.error('Error fetching user profile:', profileError);
    return null;
  }
  
  // Fetch all data in parallel
  const [
    subscriptionResult,
    projectsResult,
    audioResult,
    usageResult,
    audioCharsResult,
    transactionsResult,
  ] = await Promise.all([
    // Active subscription
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    
    // Projects count
    supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // Audio count
    supabase
      .from('project_audio')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    
    // All usage records (to sum total usage)
    supabase
      .from('usage_tracking')
      .select('characters_used, characters_preview_used, characters_production_used')
      .eq('user_id', userId),
    
    // Fallback: Sum characters from project_audio records
    supabase
      .from('project_audio')
      .select('characters_count')
      .eq('user_id', userId),
    
    // Transactions
    supabase
      .from('payment_history')
      .select('id, transaction_type, amount, currency, gateway, item_name, created_at, redirect_status')
      .eq('user_id', userId)
      .eq('visible_for_user', true)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);
  
  const subscription = subscriptionResult.data;
  const projectsCount = projectsResult.count || 0;
  const audioCount = audioResult.count || 0;
  const usageRecords = usageResult.data || [];
  const audioCharRecords = audioCharsResult.data || [];
  const transactions = transactionsResult.data || [];
  
  // Calculate total characters used across all periods
  let charactersUsed = 0;
  let charactersLimit: number | null = null;
  
  // Method 1: Sum from usage_tracking table
  for (const usage of usageRecords) {
    // characters_used is the main field tracked by recordUsage()
    // characters_preview_used and characters_production_used are legacy fields
    charactersUsed += (usage.characters_used || 0) + 
                      (usage.characters_preview_used || 0) + 
                      (usage.characters_production_used || 0);
  }
  
  // Method 2: Fallback - if no usage_tracking, calculate from project_audio
  if (charactersUsed === 0 && audioCharRecords.length > 0) {
    for (const audio of audioCharRecords) {
      charactersUsed += audio.characters_count || 0;
    }
  }
  
  // Determine character limit based on plan
  if (subscription) {
    const planId = subscription.plan_id;
    if (planId === 'lifetime' || planId === 'monthly_pro') {
      charactersLimit = null; // Unlimited
    } else if (planId === 'monthly') {
      charactersLimit = 1000000; // 1M characters
    } else {
      charactersLimit = 5000; // Free tier
    }
  } else {
    charactersLimit = 5000; // Free tier
  }
  
  return {
    id: profile.id,
    email: profile.email || '',
    username: profile.username,
    first_name: profile.first_name,
    last_name: profile.last_name,
    role: profile.role || 'user',
    is_legacy_user: profile.is_legacy_user || false,
    created_at: profile.created_at || new Date().toISOString(),
    
    subscription: subscription ? {
      status: subscription.status || 'unknown',
      plan_id: subscription.plan_id,
      plan_name: subscription.plan_name,
      provider: subscription.provider || 'unknown',
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      is_legacy: subscription.is_legacy || false,
      price_amount: subscription.price_amount,
      billing_interval: subscription.billing_interval,
    } : null,
    
    projectsCount,
    audioCount,
    charactersUsed,
    charactersLimit,
    transactions,
  };
}

