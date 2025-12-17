/**
 * Unified Subscription Management
 * 
 * Handles subscription checks across all payment providers:
 * - Stripe (single account for all users)
 * - PayPal (new account for new users)
 * - PayPal Legacy (old account for existing users)
 */

import { createAdminClient } from '@/lib/supabase/server';
import { syncLegacySubscriptionStatus } from './paypal-legacy';
import { PLANS, type AllPlanId } from './plans';

export interface UserSubscription {
  isActive: boolean;
  provider: 'stripe' | 'paypal' | 'paypal_legacy' | 'free';
  planId: AllPlanId;
  planName: string;
  expiresAt: string | null;
  charactersPerMonth: number;
  isLegacy: boolean;
  isAnnual?: boolean; // For displaying billing interval
  // New fields for subscription history
  status: 'active' | 'canceled' | 'expired' | 'free';
  hadPreviousSubscription: boolean;
  previousPlanName?: string;
  canceledAt?: string | null;
}

/**
 * Map legacy plan names to plan IDs
 */
function mapLegacyPlanName(planName: string | null): AllPlanId {
  if (!planName) return 'monthly';
  
  const name = planName.toLowerCase();
  
  // Annual plans
  if (name.includes('pro') && name.includes('annual')) return 'pro_annual';
  if (name.includes('basic') && name.includes('annual')) return 'basic_annual';
  
  // Monthly plans
  if (name.includes('pro')) return 'monthly_pro';
  if (name.includes('lifetime')) return 'lifetime';
  if (name.includes('basic') || name.includes('monthly')) return 'monthly';
  
  return 'monthly';
}

/**
 * Get a user's current subscription (active or most recent)
 * Checks all providers and returns the current status
 */
export async function getUserActiveSubscription(
  userId: string
): Promise<UserSubscription> {
  const supabase = createAdminClient();

  // Get all subscriptions for user, ordered by most recent first
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!subscriptions || subscriptions.length === 0) {
    return getFreePlan();
  }

  // Find active subscription first
  for (const sub of subscriptions) {
    // For legacy PayPal, verify with PayPal API
    if (sub.provider === 'paypal_legacy' && sub.status === 'active') {
      const { active } = await syncLegacySubscriptionStatus(
        sub.provider_subscription_id,
        userId
      );
      
      if (active) {
        const planId = mapLegacyPlanName(sub.plan_name);
        const plan = PLANS[planId];
        const isAnnual = plan?.interval === 'year' || (sub.plan_name || '').toLowerCase().includes('annual');
        
        return {
          isActive: true,
          provider: 'paypal_legacy',
          planId,
          planName: sub.plan_name || 'Legacy Plan',
          expiresAt: sub.current_period_end,
          charactersPerMonth: plan?.charactersPerMonth || 1000000,
          isLegacy: true,
          isAnnual,
          status: 'active',
          hadPreviousSubscription: false,
        };
      }
    }

    // For Stripe and new PayPal, trust our database
    if (sub.status === 'active') {
      const planId = (sub.plan_id as AllPlanId) || mapLegacyPlanName(sub.plan_name);
      const plan = PLANS[planId] || PLANS.monthly;
      const isAnnual = plan.interval === 'year' || (sub.plan_name || '').toLowerCase().includes('annual');

      // Self-heal: if plan_id is missing but we can infer it, write it back.
      // Prevents users from being treated as "free" due to incomplete subscription rows.
      if (!sub.plan_id && planId && (sub.plan_name || '').length > 0) {
        try {
          await supabase
            .from('subscriptions')
            .update({ plan_id: planId })
            .eq('id', sub.id);
        } catch (e) {
          console.warn('Failed to backfill subscriptions.plan_id', {
            subscriptionId: sub.id,
            userId,
            planId,
            error: e,
          });
        }
      }

      return {
        isActive: true,
        provider: sub.provider as 'stripe' | 'paypal' | 'paypal_legacy',
        planId,
        planName: sub.plan_name || plan.name,
        expiresAt: sub.current_period_end,
        charactersPerMonth: plan.charactersPerMonth,
        isLegacy: sub.is_legacy || false,
        isAnnual,
        status: 'active',
        hadPreviousSubscription: false,
      };
    }
  }

  // No active subscription - check for canceled/expired
  const mostRecentSub = subscriptions[0];
  if (mostRecentSub) {
    const planId = (mostRecentSub.plan_id as AllPlanId) || mapLegacyPlanName(mostRecentSub.plan_name);
    const status = mostRecentSub.status === 'canceled' ? 'canceled' : 'expired';
    
    return {
      isActive: false,
      provider: mostRecentSub.provider as 'stripe' | 'paypal' | 'paypal_legacy',
      planId: 'free', // They're on free now
      planName: 'Free Plan',
      expiresAt: null,
      charactersPerMonth: PLANS.free.charactersPerMonth,
      isLegacy: mostRecentSub.is_legacy || false,
      status,
      hadPreviousSubscription: true,
      previousPlanName: mostRecentSub.plan_name || PLANS[planId]?.name || 'Previous Plan',
      canceledAt: mostRecentSub.canceled_at || mostRecentSub.current_period_end,
    };
  }

  return getFreePlan();
}

/**
 * Check if user has an active paid subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userId);
  return subscription.isActive && subscription.provider !== 'free';
}

/**
 * Get the free plan details
 */
function getFreePlan(): UserSubscription {
  return {
    isActive: false,
    provider: 'free',
    planId: 'free',
    planName: 'Free Plan',
    expiresAt: null,
    charactersPerMonth: PLANS.free.charactersPerMonth,
    isLegacy: false,
    status: 'free',
    hadPreviousSubscription: false,
  };
}

/**
 * Check if user can use a feature based on their subscription
 */
export async function canUseFeature(
  userId: string,
  feature: 'premium_voices' | 'commercial_license' | 'api_access' | 'priority_support'
): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userId);
  
  // Free users don't have premium features
  if (subscription.provider === 'free') {
    return false;
  }

  // All paid plans have all features except API access
  if (feature === 'api_access') {
    return subscription.planId === 'monthly_pro' || subscription.planId === 'lifetime';
  }

  return true;
}

/**
 * Get remaining characters for the current billing period
 * Returns -1 for unlimited
 */
export async function getRemainingCharacters(userId: string): Promise<number> {
  const subscription = await getUserActiveSubscription(userId);
  
  // Lifetime or Pro plans have unlimited
  if (subscription.charactersPerMonth === -1) {
    return -1;
  }

  // TODO: Track actual usage and subtract
  // For now, return the full allowance
  return subscription.charactersPerMonth;
}



