import { createAdminClient } from '@/lib/supabase/server';
import { getPlanByPayPalPlan, type PlanId } from './plans';
import {
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  trackSubscriptionCancelledServer,
  trackSubscriptionRenewalServer,
  trackPaymentFailedServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';
import { sendPaymentNotification, sendWelcomeEmail } from '@/lib/email/brevo';

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'sandbox'
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

/**
 * Insert payment history with duplicate prevention
 * Checks if a payment with the same gateway_identifier already exists
 * Exported as insertPaymentHistorySafe for external use
 */
async function insertPaymentHistory(
  supabase: ReturnType<typeof createAdminClient>,
  payment: {
    user_id: string;
    transaction_type: string;
    gateway: string;
    gateway_identifier: string;
    gateway_event_id?: string;
    currency: string;
    amount: number;
    item_name: string;
    redirect_status: string;
    callback_status?: string;
    visible_for_user?: boolean;
    metadata?: Record<string, unknown>;
    created_at?: string;
  }
): Promise<{ success: boolean; error?: string; duplicate?: boolean }> {
  // Check if payment already exists
  const { data: existing } = await supabase
    .from('payment_history')
    .select('id')
    .eq('gateway_identifier', payment.gateway_identifier)
    .single();

  if (existing) {
    console.log('[Payment History] Duplicate prevented:', payment.gateway_identifier);
    return { success: true, duplicate: true };
  }

  // Also check for same user + amount within 5 minutes (covers different gateway_identifiers)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: recentSame } = await supabase
    .from('payment_history')
    .select('id')
    .eq('user_id', payment.user_id)
    .eq('amount', payment.amount)
    .gte('created_at', fiveMinutesAgo)
    .limit(1);

  if (recentSame && recentSame.length > 0) {
    console.log('[Payment History] Recent duplicate prevented:', payment.user_id, payment.amount);
    return { success: true, duplicate: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('payment_history').insert(payment as any);

  if (error) {
    // Handle unique constraint violation gracefully
    if (error.code === '23505') {
      console.log('[Payment History] Concurrent duplicate prevented:', payment.gateway_identifier);
      return { success: true, duplicate: true };
    }
    return { success: false, error: error.message };
  }

  return { success: true };
}

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
          // Save transaction to payment_history (with duplicate prevention)
          await insertPaymentHistory(supabase, {
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

          // Get user email for notification
          const { data: activatedUserProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

          // Send admin notification for new subscription
          sendPaymentNotification({
            type: 'new_subscription',
            userEmail: activatedUserProfile?.email || 'Unknown',
            amount: plan?.price || 0,
            currency: 'USD',
            provider: 'paypal',
            planName: plan?.name || 'Subscription',
            subscriptionId,
          }).catch(err => console.error('[PayPal Webhook] Failed to send subscription notification:', err));

          // Send welcome email to new subscriber
          if (activatedUserProfile?.email) {
            sendWelcomeEmail({
              userEmail: activatedUserProfile.email,
              planType: 'subscription',
              planName: plan?.name || 'Pro Plan',
              characterLimit: plan?.charactersPerMonth || 1000000,
            }).catch(err => console.error('[PayPal Webhook] Failed to send welcome email:', err));
          }
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
            const { data: cancelledSubRaw } = await supabase
              .from('subscriptions')
              .select('plan_id, price_amount')
              .eq('provider_subscription_id', subscriptionId)
              .single();
            
            const cancelledSub = cancelledSubRaw as { plan_id: string | null; price_amount: number | null } | null;

            trackSubscriptionCancelledServer(userId, {
              planId: cancelledSub?.plan_id || 'unknown',
              provider: 'paypal',
              subscriptionId: subscriptionId,
              reason: event.event_type,
              amount: cancelledSub?.price_amount ? cancelledSub.price_amount / 100 : undefined,
            });

            // Get user email for notification
            const { data: cancelledPayPalUserProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', userId)
              .single();

            // Send admin notification for cancellation
            sendPaymentNotification({
              type: 'cancellation',
              userEmail: cancelledPayPalUserProfile?.email || 'Unknown',
              amount: cancelledSub?.price_amount ? cancelledSub.price_amount / 100 : 0,
              currency: 'USD',
              provider: 'paypal',
              planName: cancelledSub?.plan_id || 'Subscription',
              subscriptionId: subscriptionId,
              reason: cancellationReason,
            }).catch(err => console.error('[PayPal Webhook] Failed to send cancellation notification:', err));
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
            .select('user_id, plan_id, plan_name, price_amount, provider')
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
          const planId = existingSub?.plan_id || 'monthly';
          const planName = existingSub?.plan_name || 'Monthly Plan';
          const priceAmount = existingSub?.price_amount;

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
              .in('gateway', ['paypal', 'paypal_legacy'])
              .eq('gateway_identifier', subscriptionId)
              .eq('transaction_type', 'renewal')
              .gte('created_at', today)
              .single();

            if (!existingRenewal) {
              // Determine if this is a legacy subscription (check provider field)
              const isLegacySubscription = !existingSub || existingSub.provider === 'paypal_legacy';
              const gatewayType = isLegacySubscription ? 'paypal_legacy' : 'paypal';

              // Record the payment (with duplicate prevention)
              const saleId = resource.id || `sale_${subscriptionId}_${Date.now()}`;
              await insertPaymentHistory(supabase, {
                user_id: userId,
                transaction_type: 'renewal',
                gateway: gatewayType,
                gateway_identifier: saleId, // Use sale ID for unique identification
                gateway_event_id: saleId,
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
                  sale_id: saleId,
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
              if (isLegacySubscription) {
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
                provider: gatewayType,
                currency: 'USD',
                subscriptionId,
              });

              // Get user email for notification
              const { data: renewalUserProfile } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();

              // Send admin notification for renewal
              sendPaymentNotification({
                type: 'renewal',
                userEmail: renewalUserProfile?.email || 'Unknown',
                amount: amountInDollars,
                currency: 'USD',
                provider: gatewayType,
                planName: planName || 'Subscription',
                subscriptionId,
                transactionId: resource.id,
              }).catch(err => console.error('[PayPal Webhook] Failed to send renewal notification:', err));
              
              console.log('[PayPal Webhook] ✅ Renewal payment recorded:', {
                userId,
                amount: amountInDollars,
                subscriptionId,
                gateway: gatewayType,
                isLegacy: isLegacySubscription,
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

            await insertPaymentHistory(supabase, {
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

            // Get user email for notification
            const { data: lifetimePayPalUserProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', customId)
              .single();

            // Send admin notification for lifetime purchase
            sendPaymentNotification({
              type: 'lifetime',
              userEmail: lifetimePayPalUserProfile?.email || 'Unknown',
              amount: amount,
              currency: 'USD',
              provider: 'paypal',
              planName: 'Lifetime Package',
              transactionId: captureId,
            }).catch(err => console.error('[PayPal Webhook] Failed to send lifetime notification:', err));

            // Send welcome email to lifetime user
            if (lifetimePayPalUserProfile?.email) {
              sendWelcomeEmail({
                userEmail: lifetimePayPalUserProfile.email,
                planType: 'lifetime',
                planName: 'Lifetime Pro',
                characterLimit: 'unlimited',
              }).catch(err => console.error('[PayPal Webhook] Failed to send lifetime welcome email:', err));
            }
          }
        }
        break;
      }

      // Handle payment failures (before subscription gets suspended)
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const subscriptionId = resource.id;
        
        console.log('[PayPal Webhook] Payment failed for subscription:', subscriptionId);

        if (subscriptionId) {
          // Get the subscription to find the user
          const { data: failedSub } = await supabase
            .from('subscriptions')
            .select('user_id, plan_id, price_amount')
            .eq('provider_subscription_id', subscriptionId)
            .single();

          if (failedSub) {
            // Update subscription status to past_due
            await supabase
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('provider_subscription_id', subscriptionId);

            // Track payment failure
            trackPaymentFailedServer(failedSub.user_id, {
              planId: failedSub.plan_id || 'unknown',
              provider: 'paypal',
              amount: failedSub.price_amount ? failedSub.price_amount / 100 : 0,
              errorMessage: 'Payment method declined or insufficient funds',
            });

            // Get user email for notification
            const { data: failedUserProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', failedSub.user_id)
              .single();

            // Send admin notification for payment failure
            sendPaymentNotification({
              type: 'payment_failed',
              userEmail: failedUserProfile?.email || 'Unknown',
              amount: failedSub.price_amount ? failedSub.price_amount / 100 : 0,
              currency: 'USD',
              provider: 'paypal',
              planName: failedSub.plan_id || 'Subscription',
              subscriptionId: subscriptionId,
              reason: 'Payment method declined or insufficient funds',
            }).catch(err => console.error('[PayPal Webhook] Failed to send payment failed notification:', err));
          }
        }
        break;
      }

      // Handle subscription reactivation (after successful retry payment)
      case 'BILLING.SUBSCRIPTION.RE-ACTIVATED': {
        const subscriptionId = resource.id;
        const userId = resource.custom_id;

        console.log('[PayPal Webhook] Subscription reactivated:', subscriptionId);

        if (subscriptionId) {
          // Update subscription status back to active
          await supabase
            .from('subscriptions')
            .update({ 
              status: 'active',
              canceled_at: null,
              cancellation_reason: null,
            })
            .eq('provider_subscription_id', subscriptionId);

          // If we have userId, update their role back to pro
          if (userId) {
            await supabase
              .from('profiles')
              .update({ role: 'pro' })
              .eq('id', userId)
              .neq('role', 'admin');
          } else {
            // Try to get userId from subscription record
            const { data: reactivatedSub } = await supabase
              .from('subscriptions')
              .select('user_id')
              .eq('provider_subscription_id', subscriptionId)
              .single();

            if (reactivatedSub?.user_id) {
              await supabase
                .from('profiles')
                .update({ role: 'pro' })
                .eq('id', reactivatedSub.user_id)
                .neq('role', 'admin');
            }
          }

          console.log('[PayPal Webhook] ✅ Subscription reactivated successfully');
        }
        break;
      }

      // Handle denied payments
      case 'PAYMENT.SALE.DENIED':
      case 'PAYMENT.SALE.REFUNDED':
      case 'PAYMENT.SALE.REVERSED': {
        const subscriptionId = resource.billing_agreement_id;
        
        console.log('[PayPal Webhook] Payment issue:', event.event_type, subscriptionId);

        if (subscriptionId) {
          const { data: affectedSub } = await supabase
            .from('subscriptions')
            .select('user_id, plan_id, price_amount')
            .eq('provider_subscription_id', subscriptionId)
            .single();

          if (affectedSub) {
            // Get user email for notification
            const { data: affectedUserProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', affectedSub.user_id)
              .single();

            // Send admin notification
            sendPaymentNotification({
              type: 'payment_failed',
              userEmail: affectedUserProfile?.email || 'Unknown',
              amount: affectedSub.price_amount ? affectedSub.price_amount / 100 : 0,
              currency: 'USD',
              provider: 'paypal',
              planName: affectedSub.plan_id || 'Subscription',
              subscriptionId: subscriptionId,
              reason: event.event_type.replace('PAYMENT.SALE.', ''),
            }).catch(err => console.error('[PayPal Webhook] Failed to send payment issue notification:', err));
          }
        }
        break;
      }

      default: {
        // Log unhandled events for monitoring
        console.log('[PayPal Webhook] Unhandled event type:', event.event_type);
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

/**
 * Export insertPaymentHistory for use in route handlers
 */
export const insertPaymentHistorySafe = insertPaymentHistory;
