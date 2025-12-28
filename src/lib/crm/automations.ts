/**
 * CRM Automation Logic
 * 
 * Handles automated email campaigns based on user behavior
 */

import { createAdminClient } from '@/lib/supabase/server';
import {
  sendWelcomeFreeEmail,
  sendGettingStartedTipsEmail,
  sendFirstProjectReminderEmail,
  sendCharacterLimitWarningEmail,
  sendCharacterLimitReachedEmail,
  sendInactiveUserEmail,
  sendHighEngagementUpgradeEmail,
  sendChurnPreventionEmail,
  sendWinBackEmail,
  sendMilestoneEmail,
  type CRMEmailType,
} from './emails';

// Automation configuration
export interface AutomationConfig {
  id: string;
  name: string;
  description: string;
  trigger: string;
  emailType: CRMEmailType;
  enabled: boolean;
  conditions: {
    role?: 'user' | 'pro';
    daysAfterSignup?: number;
    daysInactive?: number;
    characterUsagePercent?: number;
    projectCount?: number;
    daysUntilExpiry?: number;
    daysSinceCancelled?: number;
  };
}

// All available automations
export const AUTOMATIONS: AutomationConfig[] = [
  {
    id: 'welcome_free',
    name: 'Welcome Email (Free)',
    description: 'Send welcome email when a user signs up for free',
    trigger: 'On signup',
    emailType: 'welcome_free',
    enabled: true,
    conditions: { role: 'user' },
  },
  {
    id: 'getting_started_tips',
    name: 'Getting Started Tips',
    description: 'Send tips email 2 days after signup',
    trigger: '2 days after signup',
    emailType: 'getting_started_tips',
    enabled: true,
    conditions: { role: 'user', daysAfterSignup: 2 },
  },
  {
    id: 'first_project_reminder',
    name: 'First Project Reminder',
    description: 'Remind users who haven\'t created a project after 24 hours',
    trigger: '24h after signup, no projects',
    emailType: 'first_project_reminder',
    enabled: true,
    conditions: { role: 'user', daysAfterSignup: 1, projectCount: 0 },
  },
  {
    id: 'character_limit_80',
    name: 'Character Limit Warning (80%)',
    description: 'Warn users when they\'ve used 80% of their characters',
    trigger: '80% characters used',
    emailType: 'character_limit_warning',
    enabled: true,
    conditions: { role: 'user', characterUsagePercent: 80 },
  },
  {
    id: 'character_limit_100',
    name: 'Character Limit Reached',
    description: 'Notify users when they\'ve hit their character limit',
    trigger: '100% characters used',
    emailType: 'character_limit_reached',
    enabled: true,
    conditions: { role: 'user', characterUsagePercent: 100 },
  },
  {
    id: 'inactive_7_days',
    name: 'Inactive User (7 days)',
    description: 'Re-engage users inactive for 7 days',
    trigger: '7 days inactive',
    emailType: 'inactive_user',
    enabled: true,
    conditions: { role: 'user', daysInactive: 7 },
  },
  {
    id: 'inactive_14_days',
    name: 'Inactive User (14 days)',
    description: 'Re-engage users inactive for 14 days',
    trigger: '14 days inactive',
    emailType: 'inactive_user',
    enabled: true,
    conditions: { role: 'user', daysInactive: 14 },
  },
  {
    id: 'inactive_30_days',
    name: 'Inactive User (30 days)',
    description: 'Re-engage users inactive for 30 days',
    trigger: '30 days inactive',
    emailType: 'inactive_user',
    enabled: true,
    conditions: { role: 'user', daysInactive: 30 },
  },
  {
    id: 'high_engagement',
    name: 'High Engagement Upgrade',
    description: 'Encourage power users to upgrade',
    trigger: '10+ projects created',
    emailType: 'high_engagement_upgrade',
    enabled: true,
    conditions: { role: 'user', projectCount: 10 },
  },
  {
    id: 'churn_prevention',
    name: 'Churn Prevention',
    description: 'Reach out to users who cancelled but still have access',
    trigger: 'Subscription cancelled, in grace period',
    emailType: 'churn_prevention',
    enabled: true,
    conditions: { daysUntilExpiry: 7 },
  },
  {
    id: 'win_back',
    name: 'Win-Back Campaign',
    description: 'Try to win back churned users after 30 days',
    trigger: '30 days after churn',
    emailType: 'win_back',
    enabled: true,
    conditions: { daysSinceCancelled: 30 },
  },
  {
    id: 'milestone_10',
    name: 'Milestone: 10 Projects',
    description: 'Celebrate when user creates 10 projects',
    trigger: '10 projects created',
    emailType: 'milestone',
    enabled: true,
    conditions: { projectCount: 10 },
  },
  {
    id: 'milestone_50',
    name: 'Milestone: 50 Projects',
    description: 'Celebrate when user creates 50 projects',
    trigger: '50 projects created',
    emailType: 'milestone',
    enabled: true,
    conditions: { projectCount: 50 },
  },
  {
    id: 'milestone_100',
    name: 'Milestone: 100 Projects',
    description: 'Celebrate when user creates 100 projects',
    trigger: '100 projects created',
    emailType: 'milestone',
    enabled: true,
    conditions: { projectCount: 100 },
  },
];

// Track which emails have been sent
interface EmailLog {
  user_id: string;
  automation_id: string;
  sent_at: string;
}

/**
 * Run all enabled automations
 */
export async function runAutomations(dryRun = false): Promise<{
  processed: number;
  emailsSent: number;
  errors: number;
  details: Array<{ automation: string; user: string; status: string }>;
}> {
  const supabase = createAdminClient();
  const results = {
    processed: 0,
    emailsSent: 0,
    errors: 0,
    details: [] as Array<{ automation: string; user: string; status: string }>,
  };

  // Get email logs to avoid sending duplicates
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: emailLogs } = await (supabase as any)
    .from('crm_email_logs')
    .select('user_id, automation_id, sent_at');

  const sentEmails = new Set(
    (emailLogs || []).map((log: { user_id: string; automation_id: string }) => `${log.user_id}:${log.automation_id}`)
  );

  // Get all users with their usage data
  const { data: users } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      first_name,
      role,
      created_at,
      updated_at
    `)
    .not('email', 'is', null);

  if (!users) {
    return results;
  }

  // Get usage data
  const { data: usageData } = await supabase
    .from('usage_tracking')
    .select('user_id, characters_used');

  // Map usage data with limit calculated from role
  interface UsageWithLimit {
    user_id: string;
    characters_used: number;
    characters_limit: number;
  }
  const usageMap = new Map<string, UsageWithLimit>();
  for (const u of usageData || []) {
    // Find user role to determine limit
    const user = users.find(usr => usr.id === u.user_id);
    const limit = user?.role === 'pro' ? 1000000 : 500; // Pro = 1M, Free = 500
    usageMap.set(u.user_id, {
      user_id: u.user_id,
      characters_used: u.characters_used || 0,
      characters_limit: limit,
    });
  }

  // Get project counts
  const { data: projectCounts } = await supabase
    .from('projects')
    .select('user_id')
    .not('user_id', 'is', null);

  const projectCountMap = new Map<string, number>();
  for (const p of projectCounts || []) {
    projectCountMap.set(p.user_id, (projectCountMap.get(p.user_id) || 0) + 1);
  }

  // Get subscriptions for grace period/churn info
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('user_id, status, canceled_at, current_period_end');

  const subscriptionMap = new Map(
    (subscriptions || []).map(s => [s.user_id, s])
  );

  // Process each automation
  for (const automation of AUTOMATIONS) {
    if (!automation.enabled) continue;

    for (const user of users) {
      results.processed++;

      // Skip if already sent
      const logKey = `${user.id}:${automation.id}`;
      if (sentEmails.has(logKey)) {
        continue;
      }

      const usage = usageMap.get(user.id);
      const projectCount = projectCountMap.get(user.id) || 0;
      const subscription = subscriptionMap.get(user.id);

      // Check conditions
      if (!matchesConditions(automation, user, usage, projectCount, subscription)) {
        continue;
      }

      // Send email
      if (dryRun) {
        results.details.push({
          automation: automation.id,
          user: user.email,
          status: 'would_send (dry run)',
        });
        results.emailsSent++;
      } else {
        try {
          const emailResult = await sendAutomationEmail(
            automation,
            user,
            usage,
            projectCount,
            subscription
          );

          if (emailResult.success) {
            // Log the email
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any).from('crm_email_logs').insert({
              user_id: user.id,
              automation_id: automation.id,
              email_type: automation.emailType,
              sent_at: new Date().toISOString(),
            });

            results.details.push({
              automation: automation.id,
              user: user.email,
              status: 'sent',
            });
            results.emailsSent++;
          } else {
            results.details.push({
              automation: automation.id,
              user: user.email,
              status: `error: ${emailResult.error}`,
            });
            results.errors++;
          }
        } catch (error) {
          results.details.push({
            automation: automation.id,
            user: user.email,
            status: `error: ${error}`,
          });
          results.errors++;
        }
      }
    }
  }

  return results;
}

/**
 * Check if user matches automation conditions
 */
function matchesConditions(
  automation: AutomationConfig,
  user: { id: string; role: string | null; created_at: string | null; updated_at: string | null },
  usage: { characters_used: number; characters_limit: number } | undefined,
  projectCount: number,
  subscription: { status: string | null; canceled_at: string | null; current_period_end: string | null } | undefined
): boolean {
  const conditions = automation.conditions;
  const now = new Date();
  const userCreated = user.created_at ? new Date(user.created_at) : now;
  // Use updated_at as a proxy for last activity (profile gets updated on various actions)
  const lastActive = user.updated_at ? new Date(user.updated_at) : userCreated;

  // Role check
  if (conditions.role && user.role !== conditions.role) {
    return false;
  }

  // Days after signup
  if (conditions.daysAfterSignup !== undefined) {
    const daysSinceSignup = Math.floor((now.getTime() - userCreated.getTime()) / (1000 * 60 * 60 * 24));
    // Must be exactly on this day (±1 day tolerance for daily cron)
    if (daysSinceSignup < conditions.daysAfterSignup || daysSinceSignup > conditions.daysAfterSignup + 1) {
      return false;
    }
  }

  // Days inactive
  if (conditions.daysInactive !== undefined) {
    const daysSinceActive = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    // Must be at least this many days inactive
    if (daysSinceActive < conditions.daysInactive) {
      return false;
    }
    // But not already processed for longer inactivity periods
    if (conditions.daysInactive === 7 && daysSinceActive >= 14) return false;
    if (conditions.daysInactive === 14 && daysSinceActive >= 30) return false;
  }

  // Character usage percentage
  if (conditions.characterUsagePercent !== undefined && usage) {
    const usagePercent = Math.round((usage.characters_used / usage.characters_limit) * 100);
    if (conditions.characterUsagePercent === 80) {
      // Between 80-99%
      if (usagePercent < 80 || usagePercent >= 100) return false;
    } else if (conditions.characterUsagePercent === 100) {
      // At or over 100%
      if (usagePercent < 100) return false;
    }
  }

  // Project count (exact milestones or minimum)
  if (conditions.projectCount !== undefined) {
    if (automation.emailType === 'milestone') {
      // For milestones, must be exactly at this count
      if (projectCount !== conditions.projectCount) return false;
    } else if (automation.emailType === 'first_project_reminder') {
      // For first project reminder, must have 0 projects
      if (projectCount !== 0) return false;
    } else {
      // For upgrade pushes, must have at least this many
      if (projectCount < conditions.projectCount) return false;
    }
  }

  // Grace period (days until expiry)
  if (conditions.daysUntilExpiry !== undefined && subscription) {
    if (subscription.status !== 'canceled' || !subscription.canceled_at) {
      return false;
    }
    if (!subscription.current_period_end) return false;
    
    const periodEnd = new Date(subscription.current_period_end);
    const daysUntil = Math.floor((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    // Must be in grace period with approximately this many days left
    if (daysUntil < 0 || daysUntil > conditions.daysUntilExpiry + 1) {
      return false;
    }
  }

  // Days since cancelled (win-back)
  if (conditions.daysSinceCancelled !== undefined && subscription) {
    if (!subscription.canceled_at) return false;
    
    const cancelledAt = new Date(subscription.canceled_at);
    const daysSince = Math.floor((now.getTime() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24));
    // Must be at least this many days since cancellation
    if (daysSince < conditions.daysSinceCancelled || daysSince > conditions.daysSinceCancelled + 7) {
      return false;
    }
  }

  return true;
}

/**
 * Send the appropriate email for an automation
 */
async function sendAutomationEmail(
  automation: AutomationConfig,
  user: { id: string; email: string; first_name: string | null },
  usage: { characters_used: number; characters_limit: number } | undefined,
  projectCount: number,
  subscription: { current_period_end: string | null } | undefined
): Promise<{ success: boolean; error?: string }> {
  const baseParams = {
    email: user.email,
    firstName: user.first_name || undefined,
  };

  switch (automation.emailType) {
    case 'welcome_free':
      return sendWelcomeFreeEmail(baseParams);

    case 'getting_started_tips':
      return sendGettingStartedTipsEmail(baseParams);

    case 'first_project_reminder':
      return sendFirstProjectReminderEmail(baseParams);

    case 'character_limit_warning':
      return sendCharacterLimitWarningEmail({
        ...baseParams,
        usedCharacters: usage?.characters_used || 0,
        limitCharacters: usage?.characters_limit || 500,
      });

    case 'character_limit_reached':
      return sendCharacterLimitReachedEmail(baseParams);

    case 'inactive_user':
      const daysInactive = automation.conditions.daysInactive || 7;
      return sendInactiveUserEmail({ ...baseParams, daysInactive });

    case 'high_engagement_upgrade':
      return sendHighEngagementUpgradeEmail({ ...baseParams, projectCount });

    case 'churn_prevention':
      const periodEnd = subscription?.current_period_end 
        ? new Date(subscription.current_period_end) 
        : new Date();
      const daysUntil = Math.max(0, Math.floor((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return sendChurnPreventionEmail({ ...baseParams, daysUntilExpiry: daysUntil });

    case 'win_back':
      return sendWinBackEmail(baseParams);

    case 'milestone':
      return sendMilestoneEmail({ ...baseParams, milestone: automation.conditions.projectCount || 10 });

    default:
      return { success: false, error: 'Unknown email type' };
  }
}

/**
 * Trigger a specific automation for a user (for immediate triggers like signup)
 */
export async function triggerAutomation(
  automationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  const automation = AUTOMATIONS.find(a => a.id === automationId);
  if (!automation) {
    return { success: false, error: 'Automation not found' };
  }

  if (!automation.enabled) {
    return { success: false, error: 'Automation is disabled' };
  }

  // Check if already sent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingLog } = await (supabase as any)
    .from('crm_email_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('automation_id', automationId)
    .single();

  if (existingLog) {
    return { success: false, error: 'Email already sent' };
  }

  // Get user data
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email, first_name, role')
    .eq('id', userId)
    .single();

  if (!user || !user.email) {
    return { success: false, error: 'User not found' };
  }

  // Get usage data
  const { data: usageRaw } = await supabase
    .from('usage_tracking')
    .select('characters_used')
    .eq('user_id', userId)
    .single();

  // Calculate limit based on role
  const characterLimit = user.role === 'pro' ? 1000000 : 500;
  const usage = usageRaw ? {
    characters_used: usageRaw.characters_used || 0,
    characters_limit: characterLimit,
  } : undefined;

  // Get project count
  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Send email
  const result = await sendAutomationEmail(
    automation,
    user,
    usage,
    projectCount || 0,
    undefined
  );

  if (result.success) {
    // Log the email
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('crm_email_logs').insert({
      user_id: userId,
      automation_id: automationId,
      email_type: automation.emailType,
      sent_at: new Date().toISOString(),
    });
  }

  return result;
}

/**
 * Get automation statistics
 */
export async function getAutomationStats(): Promise<{
  automations: Array<{
    id: string;
    name: string;
    description: string;
    trigger: string;
    enabled: boolean;
    emailsSent: number;
    lastSent: string | null;
  }>;
  totalEmailsSent: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
}> {
  const supabase = createAdminClient();

  // Get email logs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = await (supabase as any)
    .from('crm_email_logs')
    .select('automation_id, sent_at')
    .order('sent_at', { ascending: false });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  let totalEmailsSent = 0;
  let emailsSentToday = 0;
  let emailsSentThisWeek = 0;

  const automationLogs: Record<string, { count: number; lastSent: string | null }> = {};

  for (const log of logs || []) {
    totalEmailsSent++;
    
    const sentAt = new Date(log.sent_at);
    if (sentAt >= today) emailsSentToday++;
    if (sentAt >= weekAgo) emailsSentThisWeek++;

    if (!automationLogs[log.automation_id]) {
      automationLogs[log.automation_id] = { count: 0, lastSent: null };
    }
    automationLogs[log.automation_id].count++;
    if (!automationLogs[log.automation_id].lastSent) {
      automationLogs[log.automation_id].lastSent = log.sent_at;
    }
  }

  const automations = AUTOMATIONS.map(a => ({
    id: a.id,
    name: a.name,
    description: a.description,
    trigger: a.trigger,
    enabled: a.enabled,
    emailsSent: automationLogs[a.id]?.count || 0,
    lastSent: automationLogs[a.id]?.lastSent || null,
  }));

  return {
    automations,
    totalEmailsSent,
    emailsSentToday,
    emailsSentThisWeek,
  };
}

/**
 * Email history entry type
 */
export interface EmailHistoryEntry {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  automation_id: string;
  automation_name: string;
  email_type: string;
  sent_at: string;
}

/**
 * Get email history with pagination
 */
export async function getEmailHistory(params: {
  page?: number;
  limit?: number;
  automationFilter?: string;
}): Promise<{
  emails: EmailHistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const supabase = createAdminClient();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = (page - 1) * limit;

  // Build query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('crm_email_logs')
    .select('id, user_id, automation_id, email_type, sent_at', { count: 'exact' });

  if (params.automationFilter && params.automationFilter !== 'all') {
    query = query.eq('automation_id', params.automationFilter);
  }

  const { data: logs, count } = await query
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!logs || logs.length === 0) {
    return {
      emails: [],
      total: 0,
      page,
      totalPages: 0,
    };
  }

  // Get unique user IDs
  const userIds: string[] = [...new Set(logs.map((l: { user_id: string }) => l.user_id))] as string[];

  // Fetch user profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .in('id', userIds);

  const profileMap = new Map(
    (profiles || []).map((p: { id: string; email: string; first_name: string | null; last_name: string | null }) => [p.id, p])
  );

  // Map automation IDs to names
  const automationNameMap = new Map(
    AUTOMATIONS.map(a => [a.id, a.name])
  );

  // Build response
  const emails: EmailHistoryEntry[] = logs.map((log: { id: string; user_id: string; automation_id: string; email_type: string; sent_at: string }) => {
    const profile = profileMap.get(log.user_id);
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null;

    return {
      id: log.id,
      user_id: log.user_id,
      user_email: profile?.email || 'Unknown',
      user_name: fullName,
      automation_id: log.automation_id,
      automation_name: automationNameMap.get(log.automation_id) || log.automation_id,
      email_type: log.email_type,
      sent_at: log.sent_at,
    };
  });

  return {
    emails,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Track conversion when a user becomes paid
 * Call this when a user subscribes or buys lifetime
 */
export async function trackCRMConversion(params: {
  userId: string;
  conversionType: 'subscription' | 'lifetime';
  planName: string;
  amountCents: number;
}): Promise<void> {
  const supabase = createAdminClient();

  try {
    // Find all CRM emails sent to this user that haven't been marked as converted
    // Only count emails sent in the last 30 days as attributable
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: emails } = await (supabase as any)
      .from('crm_email_logs')
      .select('id')
      .eq('user_id', params.userId)
      .eq('converted', false)
      .gte('sent_at', thirtyDaysAgo.toISOString());

    if (emails && emails.length > 0) {
      // Mark all these emails as converted
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('crm_email_logs')
        .update({
          converted: true,
          converted_at: new Date().toISOString(),
          conversion_type: params.conversionType,
          conversion_plan: params.planName,
          conversion_amount: params.amountCents,
        })
        .eq('user_id', params.userId)
        .eq('converted', false)
        .gte('sent_at', thirtyDaysAgo.toISOString());

      console.log(`[CRM] Marked ${emails.length} emails as converted for user ${params.userId}`);
    }
  } catch (error) {
    console.error('[CRM] Error tracking conversion:', error);
  }
}

/**
 * Get conversion stats for each automation
 */
export async function getConversionStats(): Promise<{
  automations: Array<{
    id: string;
    name: string;
    totalSent: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
  }>;
  totalConversions: number;
  totalRevenue: number;
  overallConversionRate: number;
}> {
  const supabase = createAdminClient();

  // Get all email logs with conversion data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = await (supabase as any)
    .from('crm_email_logs')
    .select('automation_id, converted, conversion_amount');

  const automationStats: Record<string, { sent: number; conversions: number; revenue: number }> = {};

  let totalSent = 0;
  let totalConversions = 0;
  let totalRevenue = 0;

  for (const log of logs || []) {
    totalSent++;

    if (!automationStats[log.automation_id]) {
      automationStats[log.automation_id] = { sent: 0, conversions: 0, revenue: 0 };
    }

    automationStats[log.automation_id].sent++;

    if (log.converted) {
      automationStats[log.automation_id].conversions++;
      automationStats[log.automation_id].revenue += log.conversion_amount || 0;
      totalConversions++;
      totalRevenue += log.conversion_amount || 0;
    }
  }

  const automations = AUTOMATIONS.map(a => {
    const stats = automationStats[a.id] || { sent: 0, conversions: 0, revenue: 0 };
    return {
      id: a.id,
      name: a.name,
      totalSent: stats.sent,
      conversions: stats.conversions,
      conversionRate: stats.sent > 0 ? (stats.conversions / stats.sent) * 100 : 0,
      revenue: stats.revenue / 100, // Convert cents to dollars
    };
  });

  return {
    automations,
    totalConversions,
    totalRevenue: totalRevenue / 100,
    overallConversionRate: totalSent > 0 ? (totalConversions / totalSent) * 100 : 0,
  };
}

