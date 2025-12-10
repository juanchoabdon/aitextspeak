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
import { PLANS, type PlanId } from './plans';

export interface UserSubscription {
  isActive: boolean;
  provider: 'stripe' | 'paypal' | 'paypal_legacy' | 'free';
  planId: PlanId;
  planName: string;
  expiresAt: string | null;
  charactersPerMonth: number;
  isLegacy: boolean;
}

/**
 * Get a user's current active subscription
 * Checks all providers and returns the active one
 */
export async function getUserActiveSubscription(
  userId: string
): Promise<UserSubscription> {
  const supabase = createAdminClient();

  // Get all subscriptions for user
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!subscriptions || subscriptions.length === 0) {
    return getFreePlan();
  }

  // Check for active subscription
  for (const sub of subscriptions) {
    // For legacy PayPal, verify with PayPal API
    if (sub.provider === 'paypal_legacy' && sub.status === 'active') {
      const { active } = await syncLegacySubscriptionStatus(
        sub.provider_subscription_id,
        userId
      );
      
      if (active) {
        return {
          isActive: true,
          provider: 'paypal_legacy',
          planId: (sub.plan_id as PlanId) || 'monthly',
          planName: sub.plan_name || 'Legacy Plan',
          expiresAt: sub.current_period_end,
          charactersPerMonth: PLANS[(sub.plan_id as PlanId) || 'monthly']?.charactersPerMonth || 100000,
          isLegacy: true,
        };
      }
    }

    // For Stripe and new PayPal, trust our database
    if (sub.status === 'active') {
      const planId = (sub.plan_id as PlanId) || 'monthly';
      const plan = PLANS[planId] || PLANS.monthly;

      return {
        isActive: true,
        provider: sub.provider as 'stripe' | 'paypal',
        planId,
        planName: sub.plan_name || plan.name,
        expiresAt: sub.current_period_end,
        charactersPerMonth: plan.charactersPerMonth,
        isLegacy: sub.is_legacy || false,
      };
    }
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
    isActive: true,
    provider: 'free',
    planId: 'free',
    planName: 'Free Plan',
    expiresAt: null,
    charactersPerMonth: PLANS.free.charactersPerMonth,
    isLegacy: false,
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



