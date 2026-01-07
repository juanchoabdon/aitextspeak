/**
 * Usage Tracking Module
 * 
 * Tracks and enforces usage limits based on user's subscription plan
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getUserActiveSubscription } from '@/lib/payments/subscription';
import { PLANS, type AllPlanId } from '@/lib/payments/plans';
import { trackServerEvent } from '@/lib/analytics/amplitude-server';

export interface UsageInfo {
  charactersUsed: number;
  charactersLimit: number;
  charactersRemaining: number;
  percentUsed: number;
  isUnlimited: boolean;
  hasReachedLimit: boolean;
  currentPlan: AllPlanId;
  planName: string;
  allowedLanguages: string[] | 'all';
}

/**
 * Get current month's usage for a user
 */
export async function getCurrentUsage(userId: string): Promise<UsageInfo> {
  const supabase = createAdminClient();
  
  // Get user's subscription
  const subscription = await getUserActiveSubscription(userId);
  const plan = PLANS[subscription.planId];
  const isUnlimited = plan.charactersPerMonth === -1;
  
  // Get current period start
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStartStr = periodStart.toISOString().split('T')[0];
  
  // Get or create usage record
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('characters_used')
    .eq('user_id', userId)
    .eq('period_start', periodStartStr)
    .single();
  
  const charactersUsed = usage?.characters_used || 0;
  const charactersLimit = plan.charactersPerMonth;
  const charactersRemaining = isUnlimited ? -1 : Math.max(0, charactersLimit - charactersUsed);
  const percentUsed = isUnlimited ? 0 : Math.min(100, (charactersUsed / charactersLimit) * 100);
  const hasReachedLimit = !isUnlimited && charactersUsed >= charactersLimit;
  
  return {
    charactersUsed,
    charactersLimit,
    charactersRemaining,
    percentUsed,
    isUnlimited,
    hasReachedLimit,
    currentPlan: subscription.planId,
    planName: subscription.planName,
    allowedLanguages: plan.allowedLanguages,
  };
}

/**
 * Check if user can generate speech with given character count
 */
export async function canGenerateSpeech(
  userId: string, 
  characterCount: number
): Promise<{ allowed: boolean; reason?: string; usage: UsageInfo }> {
  const usage = await getCurrentUsage(userId);
  
  if (usage.isUnlimited) {
    return { allowed: true, usage };
  }
  
  if (usage.hasReachedLimit) {
    return {
      allowed: false,
      reason: 'You have reached your monthly character limit. Please upgrade your plan to continue.',
      usage,
    };
  }
  
  if (usage.charactersUsed + characterCount > usage.charactersLimit) {
    const remaining = usage.charactersRemaining;
    return {
      allowed: false,
      reason: `This text has ${characterCount.toLocaleString()} characters, but you only have ${remaining.toLocaleString()} characters remaining this month. Please upgrade your plan or reduce your text.`,
      usage,
    };
  }
  
  return { allowed: true, usage };
}

/**
 * Record character usage after generating speech
 */
export async function recordUsage(
  userId: string,
  characterCount: number
): Promise<void> {
  const supabase = createAdminClient();
  
  // Get user's subscription to know the limit
  const subscription = await getUserActiveSubscription(userId);
  const plan = PLANS[subscription.planId];
  const isUnlimited = plan.charactersPerMonth === -1;
  const charactersLimit = plan.charactersPerMonth;
  
  // Get current period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];
  
  // Upsert usage record
  const { data: existing } = await supabase
    .from('usage_tracking')
    .select('id, characters_used')
    .eq('user_id', userId)
    .eq('period_start', periodStartStr)
    .single();
  
  const previousUsed = existing?.characters_used || 0;
  const newUsed = previousUsed + characterCount;
  
  if (existing) {
    await supabase
      .from('usage_tracking')
      .update({
        characters_used: newUsed,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
        period_start: periodStartStr,
        period_end: periodEndStr,
        characters_used: characterCount,
        audio_files_generated: 1,
      });
  }
  
  // Track usage events (only for users with limits)
  if (!isUnlimited && charactersLimit > 0) {
    const previousPercent = (previousUsed / charactersLimit) * 100;
    const newPercent = (newUsed / charactersLimit) * 100;
    
    // Track when crossing 80% threshold (warning)
    if (previousPercent < 80 && newPercent >= 80 && newPercent < 100) {
      trackServerEvent(userId, 'Usage Limit Warning', {
        plan: subscription.planId,
        percentage: Math.round(newPercent),
        characters_used: newUsed,
        characters_limit: charactersLimit,
        characters_remaining: Math.max(0, charactersLimit - newUsed),
      });
      console.log(`[Usage] ⚠️ User ${userId.substring(0, 8)}... reached ${Math.round(newPercent)}% usage`);
    }
    
    // Track when reaching 100% limit
    if (previousPercent < 100 && newPercent >= 100) {
      trackServerEvent(userId, 'Usage Limit Reached', {
        plan: subscription.planId,
        characters_used: newUsed,
        characters_limit: charactersLimit,
      });
      console.log(`[Usage] 🚫 User ${userId.substring(0, 8)}... reached character limit`);
    }
  }
}

/**
 * Get usage summary for display
 */
export function formatUsageSummary(usage: UsageInfo): string {
  if (usage.isUnlimited) {
    return `${usage.charactersUsed.toLocaleString()} characters used (Unlimited)`;
  }
  
  return `${usage.charactersUsed.toLocaleString()} / ${usage.charactersLimit.toLocaleString()} characters used`;
}

