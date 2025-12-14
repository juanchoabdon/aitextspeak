/**
 * PayPal Legacy Account Handler
 * 
 * This module handles read-only operations for legacy PayPal subscriptions.
 * Legacy users keep their subscriptions on the old PayPal account.
 * We only need to check subscription status - no new charges.
 */

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

/**
 * Get PayPal Legacy access token
 */
async function getLegacyAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_LEGACY_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_LEGACY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal Legacy credentials not configured');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get PayPal Legacy access token');
  }

  const data = await response.json();
  return data.access_token;
}

export interface LegacySubscriptionDetails {
  id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  status_update_time: string;
  plan_id: string;
  start_time: string;
  quantity: string;
  billing_info?: {
    outstanding_balance?: {
      currency_code: string;
      value: string;
    };
    cycle_executions?: Array<{
      tenure_type: string;
      sequence: number;
      cycles_completed: number;
      cycles_remaining: number;
      total_cycles: number;
    }>;
    last_payment?: {
      amount: {
        currency_code: string;
        value: string;
      };
      time: string;
    };
    next_billing_time?: string;
    failed_payments_count: number;
  };
  subscriber?: {
    email_address?: string;
    payer_id?: string;
    name?: {
      given_name?: string;
      surname?: string;
    };
  };
}

/**
 * Get legacy subscription details from old PayPal account
 * Use this to check if a legacy user's subscription is still active
 */
export async function getLegacySubscription(
  subscriptionId: string
): Promise<LegacySubscriptionDetails | null> {
  try {
    const accessToken = await getLegacyAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to get legacy subscription:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting legacy PayPal subscription:', error);
    return null;
  }
}

/**
 * Check if a legacy subscription is currently active
 */
export async function isLegacySubscriptionActive(
  subscriptionId: string
): Promise<boolean> {
  const subscription = await getLegacySubscription(subscriptionId);
  
  if (!subscription) {
    return false;
  }

  return subscription.status === 'ACTIVE';
}

/**
 * Get all transactions for a legacy subscription
 * Useful for auditing or displaying payment history
 */
export async function getLegacySubscriptionTransactions(
  subscriptionId: string,
  startTime: string,
  endTime: string
): Promise<unknown[] | null> {
  try {
    const accessToken = await getLegacyAccessToken();

    const params = new URLSearchParams({
      start_time: startTime,
      end_time: endTime,
    });

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/transactions?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.transactions || [];
  } catch (error) {
    console.error('Error getting legacy transactions:', error);
    return null;
  }
}

/**
 * Sync legacy subscription status to our database
 * Call this periodically or when user logs in
 */
export async function syncLegacySubscriptionStatus(
  subscriptionId: string,
  userId: string
): Promise<{ active: boolean; subscription: LegacySubscriptionDetails | null }> {
  const subscription = await getLegacySubscription(subscriptionId);
  
  if (!subscription) {
    return { active: false, subscription: null };
  }

  const isActive = subscription.status === 'ACTIVE';

  // Import dynamically to avoid circular dependencies
  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = createAdminClient();

  // Update subscription status in our database
  await supabase
    .from('subscriptions')
    .update({
      status: isActive ? 'active' : 'canceled',
      current_period_end: subscription.billing_info?.next_billing_time || null,
    })
    .eq('provider_subscription_id', subscriptionId)
    .eq('provider', 'paypal_legacy');

  // Update user role based on subscription status
  await supabase
    .from('profiles')
    .update({ role: isActive ? 'pro' : 'user' })
    .eq('id', userId);

  return { active: isActive, subscription };
}









