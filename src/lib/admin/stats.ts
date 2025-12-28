'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export interface AdminStats {
  totalUsers: number;
  legacyUsersMigrated: number;
  newUsers: number;
  freeUsers: number;
  // Recurring subscriptions (monthly/yearly)
  recurringSubscribersTotal: number;
  recurringSubscribersLegacy: number;
  recurringSubscribersNew: number;
  // Lifetime subscriptions
  lifetimeSubscribersTotal: number;
  lifetimeSubscribersLegacy: number;
  lifetimeSubscribersNew: number;
  // Legacy fields (kept for compatibility)
  activeSubscribersLegacy: number;
  activeSubscribersNew: number;
  totalActiveSubscribers: number;
  scheduledCancellations: number; // Users in grace period (canceled but still have access)
  pastDueSubscriptions: number; // Payment failed, Stripe is retrying
  totalChurned: number;
  totalProjects: number;
  totalAudioGenerated: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  // Ensure Next.js doesn't cache these admin metrics across requests.
  // Without this, you can see stale values (e.g. 0) after migrations until a restart.
  noStore();

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Run all queries in parallel for performance
  const [
    totalUsersResult,
    legacyMigratedResult,
    newUsersResult,
    // Lifetime subscriptions (plan_id = 'lifetime' OR billing_interval = 'one_time')
    lifetimeTotalResult,
    lifetimeLegacyResult,
    lifetimeNewResult,
    // Other stats
    activeSubsLegacyResult,
    activeSubsNewResult,
    totalActiveResult,
    scheduledCancellationsResult,
    pastDueResult,
    churnedResult,
    totalProjectsResult,
    totalAudioResult,
  ] = await Promise.all([
    // Total users (from profiles)
    supabase.from('profiles').select('id', { count: 'exact', head: true }),

    // Legacy users that have been migrated
    supabase.from('legacy_users').select('legacy_id', { count: 'exact', head: true }).eq('migrated', true),

    // New users (not legacy)
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_legacy_user', false),

    // === LIFETIME SUBSCRIPTIONS ===
    // Total lifetime active (plan_id = 'lifetime' OR billing_interval = 'one_time')
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .or('plan_id.eq.lifetime,billing_interval.eq.one_time'),

    // Lifetime legacy
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_legacy', true)
      .or('plan_id.eq.lifetime,billing_interval.eq.one_time'),

    // Lifetime new
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_legacy', false)
      .or('plan_id.eq.lifetime,billing_interval.eq.one_time'),

    // Active subscriptions from legacy users (all)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_legacy', true)
      .or(`current_period_end.gt.${now},current_period_end.is.null`),

    // Active subscriptions from new users (all)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_legacy', false)
      .or(`current_period_end.gt.${now},current_period_end.is.null`),

    // Total active subscribers (all providers)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),

    // Scheduled cancellations (status=active but cancel_at is set = in grace period)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('cancel_at', 'is', null),

    // Past due subscriptions (payment failed, Stripe retrying)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'past_due'),

    // Total churned subscriptions (all time)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled'),

    // Total projects
    supabase.from('projects').select('id', { count: 'exact', head: true }),

    // Total audio files generated (from project_audio)
    supabase.from('project_audio').select('id', { count: 'exact', head: true }),
  ]);

  const totalUsers = totalUsersResult.count || 0;
  const activeSubscribersLegacy = activeSubsLegacyResult.count || 0;
  const activeSubscribersNew = activeSubsNewResult.count || 0;
  const totalActiveSubscribers = totalActiveResult.count || 0;
  const scheduledCancellations = scheduledCancellationsResult.count || 0;
  const pastDueSubscriptions = pastDueResult.count || 0;
  const totalChurned = churnedResult.count || 0;
  
  // Lifetime counts
  const lifetimeSubscribersTotal = lifetimeTotalResult.count || 0;
  const lifetimeSubscribersLegacy = lifetimeLegacyResult.count || 0;
  const lifetimeSubscribersNew = lifetimeNewResult.count || 0;
  
  // Recurring = Total - Lifetime (to avoid null value issues in DB)
  const recurringSubscribersTotal = totalActiveSubscribers - lifetimeSubscribersTotal;
  const recurringSubscribersLegacy = activeSubscribersLegacy - lifetimeSubscribersLegacy;
  const recurringSubscribersNew = activeSubscribersNew - lifetimeSubscribersNew;

  return {
    totalUsers,
    legacyUsersMigrated: legacyMigratedResult.count || 0,
    newUsers: newUsersResult.count || 0,
    freeUsers: totalUsers - totalActiveSubscribers,
    // Recurring (calculated as total - lifetime)
    recurringSubscribersTotal,
    recurringSubscribersLegacy,
    recurringSubscribersNew,
    // Lifetime
    lifetimeSubscribersTotal,
    lifetimeSubscribersLegacy,
    lifetimeSubscribersNew,
    // Legacy fields
    activeSubscribersLegacy,
    activeSubscribersNew,
    totalActiveSubscribers,
    scheduledCancellations, // Users who canceled but still have access until period end
    pastDueSubscriptions, // Payment failed, Stripe is retrying
    totalChurned,
    totalProjects: totalProjectsResult.count || 0,
    totalAudioGenerated: totalAudioResult.count || 0,
  };
}






