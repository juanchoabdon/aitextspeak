'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/payments/stripe';
import type { CancellationReason } from '@/components/billing/CancellationModal';

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET!;
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';

interface CancelSubscriptionResult {
  success: boolean;
  error?: string;
  periodEnd?: string;
}

/**
 * Cancel a user's subscription with a reason
 */
export async function cancelSubscription(
  reason: CancellationReason,
  comment: string
): Promise<CancelSubscriptionResult> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Get user's active subscription
  const { data: subscription, error: subError } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (subError || !subscription) {
    return { success: false, error: 'No active subscription found' };
  }

  // Map our reasons to provider-friendly formats
  const reasonLabel = {
    'too_expensive': 'Too expensive',
    'missing_features': 'Missing features',
    'switched_service': 'Switched to another service',
    'not_using': 'Not using it',
    'technical_issues': 'Technical issues',
    'customer_service': 'Customer service',
    'temporary_pause': 'Temporary pause',
    'other': 'Other',
  }[reason] || reason;

  try {
    let periodEnd: string | undefined;

    if (subscription.provider === 'stripe') {
      // Cancel Stripe subscription at period end
      const stripeSub = await stripe.subscriptions.update(
        subscription.provider_subscription_id,
        {
          cancel_at_period_end: true,
          cancellation_details: {
            comment: comment || undefined,
            feedback: mapReasonToStripeFeedback(reason),
          },
        }
      );

      periodEnd = stripeSub.current_period_end 
        ? new Date(stripeSub.current_period_end * 1000).toISOString()
        : undefined;

      // Update our database
      await adminClient
        .from('subscriptions')
        .update({
          cancel_at: periodEnd || null,
          cancellation_reason: reason,
          cancellation_feedback: reasonLabel,
          cancellation_comment: comment || null,
        })
        .eq('id', subscription.id);

    } else if (subscription.provider === 'paypal' || subscription.provider === 'paypal_legacy') {
      // Cancel PayPal subscription
      await cancelPayPalSubscription(subscription.provider_subscription_id, reasonLabel);

      periodEnd = subscription.current_period_end || undefined;

      // Update our database - PayPal cancels immediately but we keep access until period end
      await adminClient
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancellation_reason: reason,
          cancellation_feedback: reasonLabel,
          cancellation_comment: comment || null,
        })
        .eq('id', subscription.id);

      // Note: We don't downgrade the user role yet - they keep access until period end
    } else {
      return { success: false, error: 'Unknown subscription provider' };
    }

    return { success: true, periodEnd };

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
    };
  }
}

/**
 * Map our cancellation reasons to Stripe's feedback options
 */
function mapReasonToStripeFeedback(reason: CancellationReason): 'customer_service' | 'low_quality' | 'missing_features' | 'other' | 'switched_service' | 'too_complex' | 'too_expensive' | 'unused' | undefined {
  const mapping: Record<CancellationReason, 'customer_service' | 'low_quality' | 'missing_features' | 'other' | 'switched_service' | 'too_complex' | 'too_expensive' | 'unused'> = {
    'too_expensive': 'too_expensive',
    'missing_features': 'missing_features',
    'switched_service': 'switched_service',
    'not_using': 'unused',
    'technical_issues': 'low_quality',
    'customer_service': 'customer_service',
    'temporary_pause': 'other',
    'other': 'other',
  };
  return mapping[reason];
}

/**
 * Cancel a PayPal subscription
 */
async function cancelPayPalSubscription(subscriptionId: string, reason: string): Promise<void> {
  const baseUrl = PAYPAL_MODE === 'live' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

  // Get access token
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  
  const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('Failed to get PayPal access token');
  }

  // Cancel the subscription
  const cancelResponse = await fetch(`${baseUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      reason: reason,
    }),
  });

  if (!cancelResponse.ok && cancelResponse.status !== 204) {
    const errorData = await cancelResponse.json().catch(() => ({}));
    throw new Error(errorData.message || `PayPal cancellation failed: ${cancelResponse.status}`);
  }
}

/**
 * Get the user's current subscription details for billing page
 */
export async function getSubscriptionDetails() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: subscription } = await adminClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return subscription;
}

