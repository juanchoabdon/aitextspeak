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
  // Subscription status info (for canceled/past_due/grace_period filters)
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'grace_period' | null;
  canceled_at?: string | null;
  current_period_end?: string | null;
  cancel_at?: string | null;
  cancellation_reason?: string | null;
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
    provider_subscription_id: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    is_legacy: boolean;
    price_amount: number | null;
    billing_interval: string | null;
    // Cancellation details
    canceled_at: string | null;
    cancel_at: string | null;
    cancellation_reason: string | null;
    cancellation_feedback: string | null;
    cancellation_comment: string | null;
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

export type UserFilter = 'all' | 'paying' | 'free' | 'canceled' | 'past_due' | 'grace_period';

/**
 * Fetch paginated users with optional search and filter
 */
export async function getPaginatedUsers(
  page: number = 1,
  pageSize: number = 20,
  search: string = '',
  filter: UserFilter = 'all'
): Promise<PaginatedUsersResult> {
  noStore();
  
  const supabase = createAdminClient();
  const offset = (page - 1) * pageSize;
  
  // For 'paying' filter, we need to get user IDs from subscriptions first
  if (filter === 'paying') {
    return await getPaginatedPayingUsers(page, pageSize, search);
  }
  
  // For 'canceled', 'past_due', or 'grace_period' filter, use subscription-based query
  if (filter === 'canceled' || filter === 'past_due' || filter === 'grace_period') {
    return await getPaginatedSubscriptionStatusUsers(page, pageSize, search, filter);
  }
  
  // Build base query for 'all' or 'free' users
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

  // For 'free' filter, we need to filter out paying users
  if (filter === 'free') {
    const freeUsers = users.filter(u => u.billing_provider === 'free');
    return {
      users: freeUsers,
      totalCount: freeUsers.length,
      page,
      pageSize,
      totalPages: Math.ceil(freeUsers.length / pageSize),
    };
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
 * Fetch paginated users who have active subscriptions
 */
async function getPaginatedPayingUsers(
  page: number,
  pageSize: number,
  search: string
): Promise<PaginatedUsersResult> {
  const supabase = createAdminClient();
  const offset = (page - 1) * pageSize;
  
  // Get all active subscription user IDs
  const { data: subsData, error: subsError } = await supabase
    .from('subscriptions')
    .select('user_id, provider')
    .eq('status', 'active');
  
  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  // Create a map of user_id -> provider
  const userProviderMap = new Map<string, UserListItem['billing_provider']>();
  for (const sub of subsData || []) {
    if (!userProviderMap.has(sub.user_id)) {
      userProviderMap.set(sub.user_id, sub.provider as UserListItem['billing_provider']);
    }
  }
  
  const payingUserIds = [...userProviderMap.keys()];
  
  if (payingUserIds.length === 0) {
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  // Now fetch profiles for these paying users
  let query = supabase
    .from('profiles')
    .select('id, email, username, first_name, last_name, role, is_legacy_user, created_at', { count: 'exact' })
    .in('id', payingUserIds);
  
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
    console.error('Error fetching paying users:', error);
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  const users = (data || []).map(u => ({
    ...u,
    billing_provider: userProviderMap.get(u.id) || 'free',
  })) as UserListItem[];
  
  const totalCount = count || 0;
  
  return {
    users,
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/**
 * Fetch paginated users by subscription status (canceled, past_due, or grace_period)
 * Uses paginated subscription query to avoid URL length issues
 */
async function getPaginatedSubscriptionStatusUsers(
  page: number,
  pageSize: number,
  search: string,
  status: 'canceled' | 'past_due' | 'grace_period'
): Promise<PaginatedUsersResult> {
  const supabase = createAdminClient();
  const offset = (page - 1) * pageSize;
  const now = new Date().toISOString();
  
  // Build query based on status type
  let countQuery = supabase.from('subscriptions').select('id', { count: 'exact', head: true });
  
  if (status === 'grace_period') {
    // Grace period: active subscriptions with cancel_at set (scheduled cancellation)
    countQuery = countQuery
      .eq('status', 'active')
      .not('cancel_at', 'is', null);
  } else {
    countQuery = countQuery.eq('status', status);
  }
  
  const { count: totalSubsCount } = await countQuery;
  
  if (!totalSubsCount || totalSubsCount === 0) {
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  // Get paginated subscriptions
  const orderColumn = status === 'canceled' ? 'canceled_at' : 'created_at';
  
  let subsQuery = supabase
    .from('subscriptions')
    .select('user_id, provider, status, canceled_at, current_period_end, cancel_at, cancellation_reason');
  
  if (status === 'grace_period') {
    // Grace period: active subscriptions with cancel_at set
    subsQuery = subsQuery
      .eq('status', 'active')
      .not('cancel_at', 'is', null);
  } else {
    subsQuery = subsQuery.eq('status', status);
  }
  
  const { data: subsData, error: subsError } = await subsQuery
    .order(orderColumn, { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1) as { data: Array<{
      user_id: string;
      provider: string;
      status: string;
      canceled_at: string | null;
      current_period_end: string | null;
      cancel_at: string | null;
      cancellation_reason: string | null;
    }> | null; error: any };
  
  if (subsError) {
    console.error('Error fetching subscriptions:', subsError);
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  if (!subsData || subsData.length === 0) {
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  // Create map for subscription info
  const userSubMap = new Map<string, {
    provider: UserListItem['billing_provider'];
    canceled_at: string | null;
    current_period_end: string | null;
    cancel_at: string | null;
    cancellation_reason: string | null;
  }>();
  
  for (const sub of subsData) {
    userSubMap.set(sub.user_id, {
      provider: sub.provider as UserListItem['billing_provider'],
      canceled_at: sub.canceled_at,
      current_period_end: sub.current_period_end,
      cancel_at: sub.cancel_at,
      cancellation_reason: sub.cancellation_reason,
    });
  }
  
  const userIds = [...userSubMap.keys()];
  
  // Fetch profiles for just these users (small batch, safe for .in())
  let query = supabase
    .from('profiles')
    .select('id, email, username, first_name, last_name, role, is_legacy_user, created_at')
    .in('id', userIds);
  
  // Apply search filter if provided
  if (search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    query = query.or(`email.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},username.ilike.${searchTerm}`);
  }
  
  const { data: profilesData, error: profilesError } = await query;
  
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
    return { users: [], totalCount: 0, page, pageSize, totalPages: 0 };
  }
  
  // Create a profile map for quick lookup
  const profileMap = new Map((profilesData || []).map(p => [p.id, p]));
  
  // Build users list in the same order as subscriptions
  const users: UserListItem[] = [];
  for (const sub of subsData) {
    const profile = profileMap.get(sub.user_id);
    if (profile) {
      // Check if search matches (if search provided)
      if (search.trim()) {
        const searchLower = search.trim().toLowerCase();
        const matches = 
          profile.email?.toLowerCase().includes(searchLower) ||
          profile.first_name?.toLowerCase().includes(searchLower) ||
          profile.last_name?.toLowerCase().includes(searchLower) ||
          profile.username?.toLowerCase().includes(searchLower);
        
        if (!matches) continue;
      }
      
      const subInfo = userSubMap.get(sub.user_id);
      users.push({
        id: profile.id,
        email: profile.email || '',
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        role: profile.role || 'user',
        is_legacy_user: profile.is_legacy_user || false,
        created_at: profile.created_at || new Date().toISOString(),
        billing_provider: subInfo?.provider || 'free',
        subscription_status: status === 'grace_period' ? 'grace_period' : status,
        canceled_at: subInfo?.canceled_at || null,
        current_period_end: subInfo?.current_period_end || null,
        cancel_at: subInfo?.cancel_at || null,
        cancellation_reason: subInfo?.cancellation_reason || null,
      });
    }
  }
  
  // For search, we need to re-query to get accurate total count
  let totalCount = totalSubsCount;
  if (search.trim()) {
    // When searching, the total count is just the filtered results
    // This is an approximation - for full search we'd need a different approach
    totalCount = users.length;
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
    projectsWithIdsResult,
    usageResult,
    transactionsResult,
  ] = await Promise.all([
    // Get most recent subscription (including canceled/past_due)
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    
    // Projects with IDs (to count audio)
    supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId),
    
    // All usage records (to sum total usage)
    supabase
      .from('usage_tracking')
      .select('characters_used, characters_preview_used, characters_production_used')
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
  
  const subscription = subscriptionResult.data as (typeof subscriptionResult.data & {
    cancellation_reason?: string | null;
    cancellation_feedback?: string | null;
    cancellation_comment?: string | null;
  }) | null;
  
  const projects = projectsWithIdsResult.data || [];
  const projectsCount = projects.length;
  const projectIds = projects.map(p => p.id);
  
  // Fetch audio count for user's projects
  let audioCount = 0;
  let audioCharRecords: { characters_count: number | null }[] = [];
  
  if (projectIds.length > 0) {
    const [audioCountResult, audioCharsResult] = await Promise.all([
      supabase
        .from('project_audio')
        .select('id', { count: 'exact', head: true })
        .in('project_id', projectIds),
      supabase
        .from('project_audio')
        .select('characters_count')
        .in('project_id', projectIds),
    ]);
    
    audioCount = audioCountResult.count || 0;
    audioCharRecords = audioCharsResult.data || [];
  }
  
  const usageRecords = usageResult.data || [];
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
      provider_subscription_id: subscription.provider_subscription_id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
      is_legacy: subscription.is_legacy || false,
      price_amount: subscription.price_amount,
      billing_interval: subscription.billing_interval,
      canceled_at: subscription.canceled_at,
      cancel_at: subscription.cancel_at,
      cancellation_reason: subscription.cancellation_reason ?? null,
      cancellation_feedback: subscription.cancellation_feedback ?? null,
      cancellation_comment: subscription.cancellation_comment ?? null,
    } : null,
    
    projectsCount,
    audioCount,
    charactersUsed,
    charactersLimit,
    transactions,
  };
}

