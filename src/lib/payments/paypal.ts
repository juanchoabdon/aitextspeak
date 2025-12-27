import { createAdminClient } from '@/lib/supabase/server';
import { getPlanByPayPalPlan, type PlanId } from './plans';
import {
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  trackSubscriptionCancelledServer,
  trackSubscriptionRenewalServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';

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
  status: string; // ACTIVE, APPROVAL_PENDING, APPROVED, SUSPENDED, CANCELLED, EXPIRED
  start_time: string;
  billing_info?: {
    next_billing_time?: string;
  };
  subscriber?: {
    payer_id?: string;
    email_address?: string;
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
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    
    // Log configuration for debugging
    console.log('[PayPal Webhook] Verification attempt:', {
      hasWebhookId: !!webhookId,
      webhookIdLength: webhookId?.length || 0,
      paypalMode: process.env.PAYPAL_MODE || 'live',
      apiBase: PAYPAL_API_BASE,
      headers: {
        authAlgo: headers['paypal-auth-algo'] || 'MISSING',
        certUrl: headers['paypal-cert-url']?.substring(0, 50) || 'MISSING',
        transmissionId: headers['paypal-transmission-id'] || 'MISSING',
        transmissionSig: headers['paypal-transmission-sig']?.substring(0, 20) || 'MISSING',
        transmissionTime: headers['paypal-transmission-time'] || 'MISSING',
      },
    });

    if (!webhookId) {
      console.error('[PayPal Webhook] PAYPAL_WEBHOOK_ID environment variable is not set!');
      return false;
    }

    const accessToken = await getAccessToken();

    const verifyPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: JSON.parse(body),
    };

    const response = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      }
    );

    const result = await response.json();
    
    console.log('[PayPal Webhook] Verification response:', {
      status: response.status,
      ok: response.ok,
      verificationStatus: result.verification_status,
      error: result.error || result.message || null,
    });

    if (!response.ok) {
      console.error('[PayPal Webhook] Verification API error:', result);
      return false;
    }

    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('[PayPal Webhook] Verification exception:', error);
    return false;
  }
}

interface PayPalWebhookResource {
  id?: string;
  custom_id?: string;
  plan_id?: string;
  status?: string; // Subscription status: ACTIVE, APPROVAL_PENDING, etc.
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
      case 'BILLING.SUBSCRIPTION.CREATED':
      case 'BILLING.SUBSCRIPTION.ACTIVATED': {
        const subscriptionId = resource.id;
        const userId = resource.custom_id;
        const planId = resource.plan_id;
        // Get subscription status from resource, or infer from event type
        const subscriptionStatus = resource.status || 
          (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' ? 'ACTIVE' : 'APPROVAL_PENDING');

        if (!userId || !subscriptionId) {
          console.error('Missing userId or subscriptionId', { subscriptionId, userId, planId, eventType: event.event_type });
          break;
        }

        const plan = planId ? getPlanByPayPalPlan(planId) : null;

        // Determine status based on subscription state
        // CREATED might be incomplete/approval_pending, ACTIVATED is always active
        const dbStatus = (subscriptionStatus === 'ACTIVE' || event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED')
          ? 'active' 
          : 'incomplete';

        await supabase.from('subscriptions').upsert({
          user_id: userId,
          provider: 'paypal',
          provider_subscription_id: subscriptionId,
          provider_customer_id: resource.subscriber?.payer_id || null,
          status: dbStatus,
          plan_id: plan?.id || 'monthly',
          plan_name: plan?.name || 'Monthly',
          // subscriptions.price_amount is stored as INTEGER cents in the DB
          price_amount: Math.round((plan?.price || 0) * 100),
          price_currency: 'USD',
          billing_interval: plan?.interval as 'month' | 'year' | null,
          current_period_start: resource.start_time || null,
          current_period_end: resource.billing_info?.next_billing_time || null,
          is_legacy: false,
        }, {
          // Use guaranteed unique constraint (provider, provider_subscription_id)
          onConflict: 'provider,provider_subscription_id',
        });

        // Only create payment_history and update role when subscription is activated
        if (event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED' || subscriptionStatus === 'ACTIVE') {
          // Check if payment_history already exists for this subscription
          const { data: existingPayment } = await supabase
            .from('payment_history')
            .select('id')
            .eq('user_id', userId)
            .eq('gateway', 'paypal')
            .eq('gateway_identifier', subscriptionId)
            .eq('transaction_type', 'subscription')
            .single();

          if (!existingPayment) {
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
          }

          await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', userId);

          // Track analytics
          trackPaymentCompleted(userId, {
            planId: plan?.id || 'monthly',
            amount: plan?.price || 0,
            provider: 'paypal',
            isRecurring: true,
            currency: 'USD',
            subscriptionId,
          });
          trackSubscriptionActivatedServer(userId, {
            planId: plan?.id || 'monthly',
            provider: 'paypal',
            subscriptionId,
          });
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.EXPIRED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subscriptionId = resource.id;
        const userId = resource.custom_id;
        
        // Map PayPal event types to cancellation reasons
        const cancellationReasonMap: Record<string, string> = {
          'BILLING.SUBSCRIPTION.CANCELLED': 'user_cancelled',
          'BILLING.SUBSCRIPTION.EXPIRED': 'subscription_expired',
          'BILLING.SUBSCRIPTION.SUSPENDED': 'payment_failed',
        };
        const cancellationReason = cancellationReasonMap[event.event_type] || event.event_type;

        if (subscriptionId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              cancellation_reason: cancellationReason,
            })
            .eq('provider_subscription_id', subscriptionId);
        }

        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);

          // Track subscription cancellation with amount
          if (subscriptionId) {
            const { data: cancelledSub } = await supabase
              .from('subscriptions')
              .select('plan_id, price_amount, cancellation_comment')
              .eq('provider_subscription_id', subscriptionId)
              .single() as { data: { plan_id: string | null; price_amount: number | null; cancellation_comment: string | null } | null };

            trackSubscriptionCancelledServer(userId, {
              planId: cancelledSub?.plan_id || 'unknown',
              provider: 'paypal',
              subscriptionId: subscriptionId,
              reason: event.event_type,
              amount: cancelledSub?.price_amount ? cancelledSub.price_amount / 100 : undefined,
              comment: cancelledSub?.cancellation_comment || undefined,
            });
          }
        }
        break;
      }

      case 'BILLING.SUBSCRIPTION.RENEWED':
      case 'PAYMENT.SALE.COMPLETED': {
        // billing_agreement_id is used for PAYMENT.SALE.COMPLETED
        // resource.id is used for BILLING.SUBSCRIPTION.RENEWED
        const subscriptionId = resource.billing_agreement_id || resource.id;
        
        // For PAYMENT.SALE.COMPLETED, amount can be in different locations:
        // - resource.amount.total (older format)
        // - resource.amount.value (newer format)
        const amountObj = resource.amount as { total?: string; value?: string } | undefined;
        const saleAmount = amountObj?.total 
          ? parseFloat(amountObj.total) 
          : amountObj?.value 
            ? parseFloat(amountObj.value) 
            : null;

        console.log('[PayPal Webhook] Renewal/Sale event:', {
          eventType: event.event_type,
          subscriptionId,
          saleAmount,
          resourceId: resource.id,
        });

        if (subscriptionId && subscriptionId.startsWith('I-')) {
          // Check if subscription exists in our database first
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('user_id, plan_id, plan_name, price_amount')
            .eq('provider_subscription_id', subscriptionId)
            .single();

          // If subscription exists in our DB, update it
          if (existingSub) {
            const subscription = await getPayPalSubscription(subscriptionId);
            if (subscription) {
              await supabase
                .from('subscriptions')
                .update({
                  status: 'active',
                  current_period_end: subscription.billing_info?.next_billing_time || null,
                })
                .eq('provider_subscription_id', subscriptionId);
            }
          }

          // Get user from subscriptions table OR from legacy payment_history
          let userId: string | null = existingSub?.user_id || null;
          let planId = existingSub?.plan_id || 'monthly';
          let planName = existingSub?.plan_name || 'Monthly Plan';
          let priceAmount = existingSub?.price_amount;

          // If not found in subscriptions, try to find from legacy payment_history
          if (!userId) {
            const { data: legacyPayment } = await supabase
              .from('payment_history')
              .select('user_id')
              .eq('gateway_identifier', subscriptionId)
              .eq('gateway', 'paypal')
              .limit(1)
              .single();
            
            if (legacyPayment?.user_id) {
              userId = legacyPayment.user_id;
              console.log('[PayPal Webhook] Found user from legacy payment_history:', userId);
            }
          }

          if (userId) {
            // price_amount is stored in cents, convert to dollars for payment_history
            // Or use the actual sale amount from the webhook if available
            const amountInDollars = saleAmount || (priceAmount ? priceAmount / 100 : 9.99);
              
            // Check if we already recorded this renewal (avoid duplicates)
            const today = new Date().toISOString().split('T')[0];
            const { data: existingRenewal } = await supabase
              .from('payment_history')
              .select('id')
              .eq('user_id', userId)
              .eq('gateway', 'paypal')
              .eq('gateway_identifier', subscriptionId)
              .eq('transaction_type', 'renewal')
              .gte('created_at', today)
              .single();

            if (!existingRenewal) {
              // Record the payment
              await supabase.from('payment_history').insert({
                user_id: userId,
                transaction_type: 'renewal',
                gateway: 'paypal',
                gateway_identifier: subscriptionId,
                gateway_event_id: resource.id, // The actual sale/event ID
                currency: 'USD',
                amount: amountInDollars,
                item_name: planName || 'Subscription Renewal',
                redirect_status: 'success',
                callback_status: 'success',
                visible_for_user: true,
                metadata: {
                  plan_id: planId,
                  subscription_id: subscriptionId,
                  event_type: event.event_type,
                  sale_id: resource.id,
                },
              });

              // Enable service for the user - update role to 'pro'
              await supabase
                .from('profiles')
                .update({ role: 'pro' })
                .eq('id', userId)
                .neq('role', 'admin'); // Don't downgrade admins

              console.log('[PayPal Webhook] ✅ User role updated to pro:', userId);

              // For legacy subscriptions, create/update subscription record
              if (!existingSub) {
                // Calculate next billing (approximately 1 month from now)
                const nextBilling = new Date();
                nextBilling.setMonth(nextBilling.getMonth() + 1);

                await supabase.from('subscriptions').upsert({
                  user_id: userId,
                  provider: 'paypal_legacy',
                  provider_subscription_id: subscriptionId,
                  status: 'active',
                  plan_id: 'monthly',
                  plan_name: 'Basic Plan (Legacy)',
                  price_amount: Math.round(amountInDollars * 100), // Store in cents
                  price_currency: 'USD',
                  billing_interval: 'month',
                  current_period_end: nextBilling.toISOString(),
                  is_legacy: true,
                }, {
                  onConflict: 'provider,provider_subscription_id',
                });

                console.log('[PayPal Webhook] ✅ Legacy subscription record created/updated');
              }

              // Track renewal in Amplitude
              trackSubscriptionRenewalServer(userId, {
                planId: planId || 'unknown',
                amount: amountInDollars,
                provider: 'paypal',
                currency: 'USD',
                subscriptionId,
              });
              
              console.log('[PayPal Webhook] ✅ Renewal payment recorded:', {
                userId,
                amount: amountInDollars,
                subscriptionId,
                isLegacy: !existingSub,
              });
            } else {
              console.log('[PayPal Webhook] Renewal already recorded for today, skipping');
            }
          } else {
            console.log('[PayPal Webhook] ⚠️ Could not find user for subscription:', subscriptionId);
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
              // subscriptions.price_amount is stored as INTEGER cents in the DB
              price_amount: Math.round(amount * 100),
              price_currency: 'USD',
              billing_interval: null,
              is_legacy: false,
            }, {
              // Use guaranteed unique constraint (provider, provider_subscription_id)
              onConflict: 'provider,provider_subscription_id',
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

            // Track analytics for lifetime purchase
            trackPaymentCompleted(customId, {
              planId: 'lifetime',
              amount: amount,
              provider: 'paypal',
              isRecurring: false,
              currency: 'USD',
            });
          }
        }
        break;
      }
    }

    // Flush analytics events before returning (important for serverless)
    await flushAmplitude();

    return { success: true };
  } catch (error) {
    console.error('PayPal webhook handler error:', error);
    return { success: false, error: 'Webhook handler failed' };
  }
}



