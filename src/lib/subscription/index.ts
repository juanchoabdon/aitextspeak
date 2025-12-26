/**
 * Subscription Management Module
 * 
 * This module provides a unified way to check and manage user subscriptions.
 * It ensures our database stays in sync with payment providers.
 * 
 * STRATEGY:
 * 1. Webhooks handle real-time updates from Stripe/PayPal
 * 2. Daily cron job catches any missed webhooks
 * 3. Access checks verify status before granting premium features
 */

import { createAdminClient } from '@/lib/supabase/server';

export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'paused' | 'incomplete' | 'trialing';
export type SubscriptionProvider = 'stripe' | 'paypal' | 'paypal_legacy';

export interface UserSubscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  provider: SubscriptionProvider;
  isLifetime: boolean;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
}

export interface SubscriptionCheck {
  hasAccess: boolean;
  subscription: UserSubscription | null;
  reason: 'active' | 'lifetime' | 'admin' | 'no_subscription' | 'expired' | 'canceled';
}

/**
 * Check if a user has premium access.
 * This is the main function to use before granting access to premium features.
 * 
 * @param userId - The user's ID
 * @returns Whether the user has access and their subscription details
 */
export async function checkSubscription(userId: string): Promise<SubscriptionCheck> {
  const supabase = createAdminClient();

  // First, check if user is an admin (always has access)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin') {
    return {
      hasAccess: true,
      subscription: null,
      reason: 'admin',
    };
  }

  // Get the user's active subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    return {
      hasAccess: false,
      subscription: null,
      reason: 'no_subscription',
    };
  }

  const isLifetime = subscription.plan_id === 'lifetime' || subscription.billing_interval === null;

  // Lifetime subscriptions never expire
  if (isLifetime) {
    return {
      hasAccess: true,
      subscription: mapSubscription(subscription),
      reason: 'lifetime',
    };
  }

  // Check if the subscription period has ended
  if (subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    
    // Add a 3-day grace period for payment processing
    const gracePeriod = new Date(periodEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    if (now > gracePeriod) {
      // Period has expired - subscription should be canceled
      // The daily cron will fix this, but we can mark it now
      await supabase
        .from('subscriptions')
        .update({ status: 'canceled', canceled_at: now.toISOString() })
        .eq('id', subscription.id);

      await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId)
        .neq('role', 'admin');

      return {
        hasAccess: false,
        subscription: mapSubscription({ ...subscription, status: 'canceled' }),
        reason: 'expired',
      };
    }
  }

  return {
    hasAccess: true,
    subscription: mapSubscription(subscription),
    reason: 'active',
  };
}

/**
 * Quick check if user has premium access (for UI display).
 * Uses client-side Supabase to avoid server-only restrictions.
 */
export async function hasProAccess(userId: string): Promise<boolean> {
  const result = await checkSubscription(userId);
  return result.hasAccess;
}

/**
 * Get character limit for a user based on their subscription.
 */
export async function getCharacterLimit(userId: string): Promise<number> {
  const FREE_LIMIT = 5000;
  const BASIC_LIMIT = 1000000; // 1M
  const PRO_LIMIT = Infinity; // Unlimited
  
  const result = await checkSubscription(userId);
  
  if (!result.hasAccess) {
    return FREE_LIMIT;
  }

  if (result.reason === 'lifetime' || result.subscription?.planId === 'monthly_pro') {
    return PRO_LIMIT;
  }

  if (result.subscription?.planId === 'monthly') {
    return BASIC_LIMIT;
  }

  return PRO_LIMIT; // Default for other paid plans
}

/**
 * Ensure user's role matches their subscription status.
 * Call this after any subscription change.
 */
export async function syncUserRole(userId: string): Promise<void> {
  const supabase = createAdminClient();
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  const expectedRole = subscription ? 'pro' : 'user';

  await supabase
    .from('profiles')
    .update({ role: expectedRole })
    .eq('id', userId)
    .neq('role', 'admin'); // Never downgrade admins
}

/**
 * Update subscription status and sync user role.
 * Use this when processing webhook events.
 */
export async function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  additionalData?: {
    canceledAt?: Date;
    currentPeriodEnd?: Date;
  }
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = { status };
  
  if (additionalData?.canceledAt) {
    updateData.canceled_at = additionalData.canceledAt.toISOString();
  }
  if (additionalData?.currentPeriodEnd) {
    updateData.current_period_end = additionalData.currentPeriodEnd.toISOString();
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('id', subscriptionId)
    .select('user_id')
    .single();

  if (subscription?.user_id) {
    await syncUserRole(subscription.user_id);
  }
}

// Helper to map database subscription to our interface
function mapSubscription(sub: Record<string, unknown>): UserSubscription {
  return {
    id: sub.id as string,
    userId: sub.user_id as string,
    status: sub.status as SubscriptionStatus,
    planId: sub.plan_id as string,
    planName: sub.plan_name as string,
    provider: sub.provider as SubscriptionProvider,
    isLifetime: sub.plan_id === 'lifetime' || sub.billing_interval === null,
    currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end as string) : null,
    canceledAt: sub.canceled_at ? new Date(sub.canceled_at as string) : null,
  };
}

