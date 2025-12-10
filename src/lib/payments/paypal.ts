import { createAdminClient } from '@/lib/supabase/server';
import { getPlanByPayPalPlan, type PlanId } from './plans';

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

/**
 * Get PayPal access token
 */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

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
    throw new Error('Failed to get PayPal access token');
  }

  const data = await response.json();
  return data.access_token;
}

interface PayPalLink {
  rel: string;
  href: string;
}

interface PayPalSubscriptionResponse {
  id: string;
  links: PayPalLink[];
}

/**
 * Create a PayPal subscription
 */
export async function createPayPalSubscription({
  userId,
  email,
  paypalPlanId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  planId: PlanId;
  paypalPlanId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ subscriptionId: string; approvalUrl: string } | { error: string }> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        plan_id: paypalPlanId,
        subscriber: {
          email_address: email,
        },
        custom_id: userId,
        application_context: {
          brand_name: 'AI TextSpeak',
          locale: 'en-US',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: successUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal subscription error:', error);
      return { error: 'Failed to create subscription' };
    }

    const subscription: PayPalSubscriptionResponse = await response.json();
    
    const approvalLink = subscription.links.find(
      (link) => link.rel === 'approve'
    );

    if (!approvalLink) {
      return { error: 'No approval URL found' };
    }

    return {
      subscriptionId: subscription.id,
      approvalUrl: approvalLink.href,
    };
  } catch (error) {
    console.error('PayPal error:', error);
    return { error: 'Failed to create PayPal subscription' };
  }
}

interface PayPalSubscriptionDetails {
  id: string;
  plan_id: string;
  start_time: string;
  billing_info?: {
    next_billing_time?: string;
  };
  subscriber?: {
    payer_id?: string;
  };
}

// ============================================
// PayPal Orders API (for one-time payments like Lifetime)
// ============================================

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalLink[];
}

/**
 * Create a PayPal order for one-time payment (Lifetime package)
 */
export async function createPayPalOrder({
  userId,
  amount,
  itemName,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  amount: number;
  itemName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approvalUrl: string } | { error: string }> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `order-${userId}-${Date.now()}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: userId,
            description: itemName,
            custom_id: userId,
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2),
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'AI TextSpeak',
              locale: 'en-US',
              shipping_preference: 'NO_SHIPPING',
              user_action: 'PAY_NOW',
              return_url: successUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal order error:', error);
      return { error: 'Failed to create order' };
    }

    const order: PayPalOrderResponse = await response.json();
    
    const approvalLink = order.links.find(
      (link) => link.rel === 'payer-action'
    );

    if (!approvalLink) {
      return { error: 'No approval URL found' };
    }

    return {
      orderId: order.id,
      approvalUrl: approvalLink.href,
    };
  } catch (error) {
    console.error('PayPal order error:', error);
    return { error: 'Failed to create PayPal order' };
  }
}

/**
 * Capture a PayPal order after user approval
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean;
  captureId?: string;
  payerId?: string;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('PayPal capture error:', error);
      return { success: false, error: 'Failed to capture payment' };
    }

    const result = await response.json();
    
    return {
      success: true,
      captureId: result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
      payerId: result.payer?.payer_id,
    };
  } catch (error) {
    console.error('PayPal capture error:', error);
    return { success: false, error: 'Failed to capture payment' };
  }
}

/**
 * Get PayPal order details
 */
export async function getPayPalOrder(orderId: string): Promise<{
  id: string;
  status: string;
  custom_id?: string;
  payer?: { payer_id?: string };
  purchase_units?: Array<{ custom_id?: string; reference_id?: string }>;
} | null> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`,
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

    return await response.json();
  } catch (error) {
    console.error('Error getting PayPal order:', error);
    return null;
  }
}

/**
 * Get subscription details from PayPal
 */
export async function getPayPalSubscription(subscriptionId: string): Promise<PayPalSubscriptionDetails | null> {
  try {
    const accessToken = await getAccessToken();

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
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting PayPal subscription:', error);
    return null;
  }
}

/**
 * Cancel a PayPal subscription
 */
export async function cancelPayPalSubscription(subscriptionId: string, reason: string): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error canceling PayPal subscription:', error);
    return false;
  }
}

/**
 * Verify PayPal webhook signature
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    const webhookId = process.env.PAYPAL_WEBHOOK_ID!;

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: headers['paypal-auth-algo'],
          cert_url: headers['paypal-cert-url'],
          transmission_id: headers['paypal-transmission-id'],
          transmission_sig: headers['paypal-transmission-sig'],
          transmission_time: headers['paypal-transmission-time'],
          webhook_id: webhookId,
          webhook_event: JSON.parse(body),
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

interface PayPalWebhookResource {
  id?: string;
  custom_id?: string;
  plan_id?: string;
  start_time?: string;
  billing_agreement_id?: string;
  subscriber?: {
    payer_id?: string;
  };
  billing_info?: {
    next_billing_time?: string;
  };
  // For capture events (one-time payments)
  amount?: {
    value?: string;
    currency_code?: string;
  };
  supplementary_data?: {
    related_ids?: {
      order_id?: string;
    };
  };
  purchase_units?: Array<{
    custom_id?: string;
    reference_id?: string;
  }>;
}

interface PayPalWebhookEvent {
  event_type: string;
  resource: PayPalWebhookResource;
}

/**
 * Handle PayPal webhook events
 */
export async function handlePayPalWebhook(
  event: PayPalWebhookEvent
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    const resource = event.resource;

    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscriptionId = resource.id;
        const userId = resource.custom_id;
        const planId = resource.plan_id;

        if (!userId || !subscriptionId) {
          console.error('Missing userId or subscriptionId');
          break;
        }

        const plan = planId ? getPlanByPayPalPlan(planId) : null;

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          provider: 'paypal',
          provider_subscription_id: subscriptionId,
          provider_customer_id: resource.subscriber?.payer_id || null,
          status: 'active',
          plan_id: plan?.id || 'monthly',
          plan_name: plan?.name || 'Monthly',
          price_amount: plan?.price || 0,
          price_currency: 'USD',
          billing_interval: plan?.interval as 'month' | 'year' | null,
          current_period_start: resource.start_time || null,
          current_period_end: resource.billing_info?.next_billing_time || null,
          is_legacy: false,
        }, {
          onConflict: 'user_id,provider',
        });

        // Save transaction to payment_history
        await supabase.from('payment_history').insert({
          user_id: userId,
          transaction_type: 'subscription',
          gateway: 'paypal',
          gateway_identifier: subscriptionId,
          currency: 'USD',
          amount: plan?.price || 0,
          item_name: plan?.name || 'Subscription',
          redirect_status: 'success',
          callback_status: 'success',
          visible_for_user: true,
          metadata: {
            plan_id: plan?.id,
            paypal_plan_id: planId,
            payer_id: resource.subscriber?.payer_id,
          },
        });

        await supabase
          .from('profiles')
          .update({ role: 'pro' })
          .eq('id', userId);
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subscriptionId = resource.id;
        const userId = resource.custom_id;

        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
            })
            .eq('provider_subscription_id', subscriptionId);
        }

        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.RENEWED':
      case 'PAYMENT.SALE.COMPLETED': {
        const subscriptionId = resource.billing_agreement_id || resource.id;

        if (subscriptionId) {
          const subscription = await getPayPalSubscription(subscriptionId);
          if (subscription) {
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                current_period_end: subscription.billing_info?.next_billing_time || null,
              })
              .eq('provider_subscription_id', subscriptionId);

            // Get user and log renewal payment
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('user_id, plan_id, plan_name, price_amount')
              .eq('provider_subscription_id', subscriptionId)
              .single();

            if (sub?.user_id) {
              await supabase.from('payment_history').insert({
                user_id: sub.user_id,
                transaction_type: 'renewal',
                gateway: 'paypal',
                gateway_identifier: subscriptionId,
                currency: 'USD',
                amount: sub.price_amount || 0,
                item_name: sub.plan_name || 'Subscription Renewal',
                redirect_status: 'success',
                callback_status: 'success',
                visible_for_user: true,
                metadata: {
                  plan_id: sub.plan_id,
                  subscription_id: subscriptionId,
                  event_type: event.event_type,
                },
              });
            }
          }
        }
        break;
      }

      // One-time payment (Lifetime package) via Orders API
      case 'PAYMENT.CAPTURE.COMPLETED': {
        // This is a backup for one-time payments - main handling is in /api/checkout/paypal/capture
        const captureId = resource.id || '';
        const orderId = resource.supplementary_data?.related_ids?.order_id || '';
        const customId = resource.custom_id || 
                         resource.purchase_units?.[0]?.custom_id ||
                         resource.purchase_units?.[0]?.reference_id;
        const amount = resource.amount?.value ? parseFloat(resource.amount.value) : 99;

        if (customId && captureId) {
          // Check if subscription already exists (created by capture route)
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', customId)
            .eq('plan_id', 'lifetime')
            .single();

          if (!existing) {
            // Create subscription if it doesn't exist (failsafe)
            await supabase.from('subscriptions').upsert({
              user_id: customId,
              provider: 'paypal',
              provider_subscription_id: orderId || captureId,
              status: 'active',
              plan_id: 'lifetime',
              plan_name: 'Lifetime',
              price_amount: amount,
              price_currency: 'USD',
              billing_interval: null,
              is_legacy: false,
            }, {
              onConflict: 'user_id,provider',
            });

            await supabase.from('payment_history').insert({
              user_id: customId,
              transaction_type: 'one_time',
              gateway: 'paypal',
              gateway_identifier: captureId,
              currency: 'USD',
              amount: amount,
              item_name: 'Lifetime Package',
              redirect_status: 'success',
              callback_status: 'success',
              visible_for_user: true,
              metadata: {
                plan_id: 'lifetime',
                order_id: orderId,
                capture_id: captureId,
                source: 'webhook',
              },
            });

            await supabase
              .from('profiles')
              .update({ role: 'pro' })
              .eq('id', customId);
          }
        }
        break;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('PayPal webhook handler error:', error);
    return { success: false, error: 'Webhook handler failed' };
  }
}



