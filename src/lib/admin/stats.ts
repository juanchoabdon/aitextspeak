'use server';

import { createAdminClient } from '@/lib/supabase/server';

export interface AdminStats {
  totalUsers: number;
  legacyUsersMigrated: number;
  newUsers: number;
  freeUsers: number;
  activeSubscribersLegacy: number;
  activeSubscribersNew: number;
  totalProjects: number;
  totalAudioGenerated: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = createAdminClient();

  // Run all queries in parallel for performance
  const [
    totalUsersResult,
    legacyMigratedResult,
    newUsersResult,
    activeSubsLegacyResult,
    activeSubsNewResult,
    totalProjectsResult,
    totalAudioResult,
  ] = await Promise.all([
    // Total users (from profiles)
    supabase.from('profiles').select('id', { count: 'exact', head: true }),

    // Legacy users that have been migrated
    supabase.from('legacy_users').select('legacy_id', { count: 'exact', head: true }).eq('migrated', true),

    // New users (not legacy)
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_legacy_user', false),

    // Active subscriptions from legacy users
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_legacy', true),

    // Active subscriptions from new users
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('is_legacy', false),

    // Total projects
    supabase.from('projects').select('id', { count: 'exact', head: true }),

    // Total audio files generated (from project_audio)
    supabase.from('project_audio').select('id', { count: 'exact', head: true }),
  ]);

  const totalUsers = totalUsersResult.count || 0;
  const activeSubscribersLegacy = activeSubsLegacyResult.count || 0;
  const activeSubscribersNew = activeSubsNewResult.count || 0;
  const totalPaidUsers = activeSubscribersLegacy + activeSubscribersNew;

  return {
    totalUsers,
    legacyUsersMigrated: legacyMigratedResult.count || 0,
    newUsers: newUsersResult.count || 0,
    freeUsers: totalUsers - totalPaidUsers,
    activeSubscribersLegacy,
    activeSubscribersNew,
    totalProjects: totalProjectsResult.count || 0,
    totalAudioGenerated: totalAudioResult.count || 0,
  };
}
