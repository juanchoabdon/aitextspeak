/**
 * Real-time subscription verification
 * 
 * Use this to verify a user's subscription status directly with the payment provider
 * before granting access to premium features.
 */

import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';

interface VerificationResult {
  isActive: boolean;
  providerStatus: string | null;
  syncNeeded: boolean;
  error?: string;
}

// ============== PayPal Helpers ==============

async function getPayPalAccessToken(): Promise<string> {
  const baseUrl = PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';
  
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

async function verifyPayPalSubscription(subscriptionId: string): Promise<{ status: string } | null> {
  try {
    // Skip non-subscription IDs (one-time payments)
    if (!subscriptionId.startsWith('I-')) {
      return null;
    }

    const accessToken = await getPayPalAccessToken();
    const baseUrl = PAYPAL_MODE === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
    
    const response = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return { status: 'NOT_FOUND' };
      throw new Error(`PayPal API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error verifying PayPal subscription ${subscriptionId}:`, error);
    return null;
  }
}

// ============== Stripe Helpers ==============

interface StripeSubscriptionData {
  id: string;
  status: string;
  current_period_end: number | null;
  current_period_start: number | null;
  canceled_at: number | null;
}

async function verifyStripeSubscription(subscriptionId: string): Promise<StripeSubscriptionData | null> {
  try {
    // Skip payment intents and checkout sessions (one-time payments)
    if (subscriptionId.startsWith('pi_') || subscriptionId.startsWith('cs_')) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as {
      id: string;
      status: string;
      current_period_end?: number;
      current_period_start?: number;
      canceled_at?: number | null;
    };
    return {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end ?? null,
      current_period_start: subscription.current_period_start ?? null,
      canceled_at: subscription.canceled_at ?? null,
    };
  } catch (error: unknown) {
    const stripeError = error as { code?: string };
    if (stripeError.code === 'resource_missing') {
      return null;
    }
    console.error(`Error verifying Stripe subscription ${subscriptionId}:`, error);
    return null;
  }
}

// ============== Main Verification Function ==============

/**
 * Verify a user's subscription status directly with the payment provider.
 * 
 * @param userId - The Supabase user ID
 * @param forceSync - If true, update our database if there's a mismatch
 * @returns Verification result with current status
 */
export async function verifySubscription(
  userId: string, 
  forceSync: boolean = false
): Promise<VerificationResult> {
  const supabase = createAdminClient();

  // Get user's subscription from our database
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    return {
      isActive: false,
      providerStatus: null,
      syncNeeded: false,
    };
  }

  // Handle lifetime subscriptions - no need to verify with provider
  if (subscription.plan_id === 'lifetime' || subscription.billing_interval === null) {
    return {
      isActive: true,
      providerStatus: 'lifetime',
      syncNeeded: false,
    };
  }

  // Verify with the appropriate provider
  let providerStatus: string | null = null;
  let isProviderActive = false;

  if (subscription.provider === 'stripe') {
    const stripeSub = await verifyStripeSubscription(subscription.provider_subscription_id);
    
    if (stripeSub) {
      providerStatus = stripeSub.status;
      isProviderActive = ['active', 'trialing'].includes(stripeSub.status);

      // Sync period end if needed
      if (forceSync && stripeSub.current_period_end) {
        await supabase
          .from('subscriptions')
          .update({
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          })
          .eq('id', subscription.id);
      }
    } else if (stripeSub === null) {
      // Subscription not found in Stripe
      providerStatus = 'not_found';
      isProviderActive = false;
    }
  } else if (subscription.provider === 'paypal' || subscription.provider === 'paypal_legacy') {
    const paypalSub = await verifyPayPalSubscription(subscription.provider_subscription_id);
    
    if (paypalSub) {
      providerStatus = paypalSub.status;
      isProviderActive = paypalSub.status === 'ACTIVE';
    } else {
      // Can't verify (might be one-time payment or API error)
      return {
        isActive: subscription.status === 'active',
        providerStatus: 'unverifiable',
        syncNeeded: false,
      };
    }
  } else {
    // Unknown provider, trust our database
    return {
      isActive: subscription.status === 'active',
      providerStatus: 'unknown_provider',
      syncNeeded: false,
    };
  }

  // Check for mismatch
  const ourIsActive = subscription.status === 'active';
  const syncNeeded = ourIsActive !== isProviderActive;

  // Force sync if requested and there's a mismatch
  if (forceSync && syncNeeded) {
    if (!isProviderActive) {
      // Provider says canceled, update our database
      await supabase
        .from('subscriptions')
        .update({ 
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      // Downgrade user role
      await supabase
        .from('profiles')
        .update({ role: 'user' })
        .eq('id', userId)
        .neq('role', 'admin');

      console.log(`[Subscription Verify] Synced user ${userId}: canceled`);
    }
  }

  return {
    isActive: isProviderActive,
    providerStatus,
    syncNeeded,
  };
}

/**
 * Quick check if a user should have premium access.
 * This uses cached database values but falls back to provider verification
 * if the subscription might be expired.
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const supabase = createAdminClient();

  // First, check our database
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (profile?.role === 'admin') {
    return true;
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, plan_id, current_period_end, billing_interval')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    return false;
  }

  // Lifetime is always active
  if (subscription.plan_id === 'lifetime' || subscription.billing_interval === null) {
    return true;
  }

  // Check if period has expired (with 1 day grace period)
  if (subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    const gracePeriod = new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000); // +1 day
    
    if (new Date() > gracePeriod) {
      // Period expired, verify with provider and sync
      const verification = await verifySubscription(userId, true);
      return verification.isActive;
    }
  }

  return true;
}

