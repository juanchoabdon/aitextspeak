import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { getPlanByStripePrice, PLANS, type PlanId } from './plans';
import {
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  trackSubscriptionCancelledServer,
  trackPaymentFailedServer,
  trackSubscriptionRenewalServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';
import { sendPaymentNotification, sendWelcomeEmail } from '@/lib/email/brevo';
import { trackCRMConversion } from '@/lib/crm/automations';

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

/**
 * Insert payment history with duplicate prevention
 * Checks if a payment with the same gateway_identifier already exists
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
 * Create a Stripe Checkout Session for a subscription
 */
export async function createCheckoutSession({
  userId,
  email,
  priceId,
  planId,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  priceId: string;
  planId: PlanId;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null; error?: string }> {
  try {
    // Check if user already has a Stripe customer
    const supabase = createAdminClient();
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('provider_customer_id')
      .eq('user_id', userId)
      .eq('provider', 'stripe')
      .single();

    let customerId = existingSub?.provider_customer_id;

    // Create or get customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      });
      customerId = customer.id;
    }

    // Determine if this is a subscription or one-time payment
    const isLifetime = planId === 'lifetime';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: isLifetime ? 'payment' : 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planId,
      },
      ...(isLifetime ? {} : {
        subscription_data: {
          metadata: {
            userId,
            planId,
          },
        },
      }),
    });

    return { url: session.url };
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return { url: null, error: 'Failed to create checkout session' };
  }
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string | null; error?: string }> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    console.error('Portal session error:', error);
    return { url: null, error: 'Failed to create portal session' };
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  body: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  function unixSecondsToIso(value: unknown): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    const d = new Date(value * 1000);
    const t = d.getTime();
    if (!Number.isFinite(t)) return null;
    return d.toISOString();
  }

  // subscriptions.price_amount is stored as INTEGER cents in the DB
  function toCents(amount: unknown): number {
    if (typeof amount === 'number' && Number.isFinite(amount)) return Math.round(amount);
    return 0;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return { success: false, error: 'Invalid signature' };
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId as PlanId;

        if (!userId) {
          console.error('No userId in session metadata');
          return { success: false, error: 'Missing userId in session metadata' };
        }

        const plan = planId ? getPlanByStripePrice(PLANS[planId]?.stripePriceId || '') || PLANS[planId] : null;

        if (session.mode === 'subscription') {
          if (!session.subscription) {
            return { success: false, error: 'Missing session.subscription for subscription checkout' };
          }

          // Handle subscription
          let subscriptionResponse: unknown;
          try {
            subscriptionResponse = await stripe.subscriptions.retrieve(session.subscription as string);
          } catch (e) {
            console.error('[Stripe Webhook] Failed to retrieve subscription', {
              eventId: event.id,
              userId,
              planId,
              subscriptionId: session.subscription,
              error: e instanceof Error ? { message: e.message, name: e.name, stack: e.stack } : e,
            });
            return {
              success: false,
              error: e instanceof Error ? `Stripe API error retrieving subscription: ${e.message}` : 'Stripe API error retrieving subscription',
            };
          }
          const subscription = subscriptionResponse as unknown as {
            id: string;
            status: string;
            currency: string;
            current_period_start: number;
            current_period_end: number;
            items: { data: Array<{ price: { id: string; unit_amount: number | null; recurring?: { interval: string } } }> };
          };

          if (!subscription?.items?.data?.[0]?.price?.id) {
            return { success: false, error: 'Stripe subscription missing price data' };
          }

          const { error: upsertSubError } = await supabase.from('subscriptions').upsert({
            user_id: userId,
            provider: 'stripe',
            provider_subscription_id: subscription.id,
            provider_customer_id: session.customer as string,
            status: subscription.status as 'active' | 'canceled',
            plan_id: planId,
            plan_name: getPlanByStripePrice(subscription.items.data[0].price.id)?.name || planId,
            // Stripe unit_amount is already in cents
            price_amount: toCents(subscription.items.data[0].price.unit_amount || 0),
            price_currency: subscription.currency.toUpperCase(),
            billing_interval: subscription.items.data[0].price.recurring?.interval as 'month' | 'year',
            current_period_start: unixSecondsToIso(subscription.current_period_start),
            current_period_end: unixSecondsToIso(subscription.current_period_end),
            is_legacy: false,
          }, {
            // Use guaranteed unique constraint (provider, provider_subscription_id)
            onConflict: 'provider,provider_subscription_id',
          });
          if (upsertSubError) {
            console.error('[Stripe Webhook] Failed to upsert subscription row', {
              eventId: event.id,
              userId,
              planId,
              error: upsertSubError,
            });
            return { success: false, error: `DB error upserting subscription: ${upsertSubError.message}` };
          }

          // Save transaction to payment_history (with duplicate prevention)
          const paymentResult = await insertPaymentHistory(supabase, {
            user_id: userId,
            transaction_type: 'subscription',
            gateway: 'stripe',
            gateway_identifier: session.id,
            gateway_event_id: event.id,
            currency: session.currency?.toUpperCase() || 'USD',
            amount: (session.amount_total || 0) / 100,
            item_name: plan?.name || planId,
            redirect_status: 'success',
            callback_status: 'success',
            visible_for_user: true,
            metadata: {
              plan_id: planId,
              subscription_id: subscription.id,
              customer_id: typeof session.customer === 'string' ? session.customer : null,
            },
          });
          if (!paymentResult.success) {
            console.error('[Stripe Webhook] Failed to insert payment_history row', {
              eventId: event.id,
              userId,
              planId,
              error: paymentResult.error,
            });
            return { success: false, error: `DB error inserting payment history: ${paymentResult.error}` };
          }

          // Update user role to 'pro'
          const { error: roleUpdateError } = await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', userId);
          if (roleUpdateError) {
            console.error('[Stripe Webhook] Failed to update profile role', {
              eventId: event.id,
              userId,
              planId,
              error: roleUpdateError,
            });
            return { success: false, error: `DB error updating profile role: ${roleUpdateError.message}` };
          }

          // Track analytics
          trackPaymentCompleted(userId, {
            planId,
            amount: (session.amount_total || 0) / 100,
            provider: 'stripe',
            isRecurring: true,
            currency: session.currency?.toUpperCase() || 'USD',
            subscriptionId: subscription.id,
          });
          trackSubscriptionActivatedServer(userId, {
            planId,
            provider: 'stripe',
            subscriptionId: subscription.id,
          });

          // Send admin notification email
          const userEmail = session.customer_email || session.customer_details?.email || 'Unknown';
          sendPaymentNotification({
            type: 'new_subscription',
            userEmail,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || 'USD',
            provider: 'stripe',
            planName: plan?.name || planId,
            subscriptionId: subscription.id,
          }).catch(err => console.error('[Stripe Webhook] Failed to send notification email:', err));

          // Send welcome email to user
          if (userEmail && userEmail !== 'Unknown') {
            sendWelcomeEmail({
              userEmail,
              planType: 'subscription',
              planName: plan?.name || 'Pro Plan',
              characterLimit: plan?.charactersPerMonth || 1000000,
            }).catch(err => console.error('[Stripe Webhook] Failed to send welcome email:', err));
          }

          // Track CRM conversion
          trackCRMConversion({
            userId,
            conversionType: 'subscription',
            planName: plan?.name || 'Pro Plan',
            amountCents: toCents(session.amount_total),
          }).catch(err => console.error('[Stripe Webhook] Failed to track CRM conversion:', err));
        } else {
          // Handle one-time payment (lifetime)
          const { error: upsertLifetimeError } = await supabase.from('subscriptions').upsert({
            user_id: userId,
            provider: 'stripe',
            provider_subscription_id: session.payment_intent as string,
            provider_customer_id: session.customer as string,
            status: 'active',
            plan_id: 'lifetime',
            plan_name: 'Lifetime',
            // Stripe amount_total is already in cents
            price_amount: toCents(session.amount_total),
            price_currency: session.currency!.toUpperCase(),
            billing_interval: null,
            is_legacy: false,
          }, {
            // Use guaranteed unique constraint (provider, provider_subscription_id)
            onConflict: 'provider,provider_subscription_id',
          });
          if (upsertLifetimeError) {
            console.error('[Stripe Webhook] Failed to upsert lifetime subscription row', {
              eventId: event.id,
              userId,
              error: upsertLifetimeError,
            });
            return { success: false, error: `DB error upserting lifetime subscription: ${upsertLifetimeError.message}` };
          }

          // Save transaction to payment_history (with duplicate prevention)
          const lifetimePaymentResult = await insertPaymentHistory(supabase, {
            user_id: userId,
            transaction_type: 'one_time',
            gateway: 'stripe',
            gateway_identifier: session.id,
            gateway_event_id: event.id,
            currency: session.currency?.toUpperCase() || 'USD',
            amount: (session.amount_total || 0) / 100,
            item_name: 'Lifetime Package',
            redirect_status: 'success',
            callback_status: 'success',
            visible_for_user: true,
            metadata: {
              plan_id: 'lifetime',
              payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : null,
              customer_id: typeof session.customer === 'string' ? session.customer : null,
            },
          });
          if (!lifetimePaymentResult.success) {
            console.error('[Stripe Webhook] Failed to insert lifetime payment_history row', {
              eventId: event.id,
              userId,
              error: lifetimePaymentResult.error,
            });
            return { success: false, error: `DB error inserting lifetime payment history: ${lifetimePaymentResult.error}` };
          }

          // Update user role to 'pro'
          const { error: lifetimeRoleError } = await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', userId);
          if (lifetimeRoleError) {
            console.error('[Stripe Webhook] Failed to update profile role (lifetime)', {
              eventId: event.id,
              userId,
              error: lifetimeRoleError,
            });
            return { success: false, error: `DB error updating profile role (lifetime): ${lifetimeRoleError.message}` };
          }

          // Track analytics for lifetime purchase
          trackPaymentCompleted(userId, {
            planId: 'lifetime',
            amount: session.amount_total! / 100,
            provider: 'stripe',
            isRecurring: false,
            currency: session.currency?.toUpperCase() || 'USD',
          });

          // Send admin notification email for lifetime
          const lifetimeUserEmail = session.customer_email || session.customer_details?.email || 'Unknown';
          sendPaymentNotification({
            type: 'lifetime',
            userEmail: lifetimeUserEmail,
            amount: (session.amount_total || 0) / 100,
            currency: session.currency?.toUpperCase() || 'USD',
            provider: 'stripe',
            planName: 'Lifetime Package',
            transactionId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          }).catch(err => console.error('[Stripe Webhook] Failed to send lifetime notification email:', err));

          // Send welcome email to lifetime user
          if (lifetimeUserEmail && lifetimeUserEmail !== 'Unknown') {
            sendWelcomeEmail({
              userEmail: lifetimeUserEmail,
              planType: 'lifetime',
              planName: 'Lifetime Pro',
              characterLimit: 500000,
            }).catch(err => console.error('[Stripe Webhook] Failed to send lifetime welcome email:', err));
          }

          // Track CRM conversion for lifetime
          trackCRMConversion({
            userId,
            conversionType: 'lifetime',
            planName: 'Lifetime Pro',
            amountCents: toCents(session.amount_total),
          }).catch(err => console.error('[Stripe Webhook] Failed to track CRM conversion:', err));
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subData = event.data.object as unknown as {
          id: string;
          status: string;
          metadata?: { userId?: string };
          current_period_start: number;
          current_period_end: number;
          cancel_at?: number | null;
          canceled_at?: number | null;
        };
        const userId = subData.metadata?.userId;

        if (!userId) break;

        await supabase
          .from('subscriptions')
          .update({
            status: subData.status as 'active' | 'canceled',
            current_period_start: unixSecondsToIso(subData.current_period_start),
            current_period_end: unixSecondsToIso(subData.current_period_end),
            cancel_at: unixSecondsToIso(subData.cancel_at),
            canceled_at: unixSecondsToIso(subData.canceled_at),
          })
          .eq('provider_subscription_id', subData.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subData = event.data.object as unknown as {
          id: string;
          metadata?: { userId?: string };
          cancellation_details?: {
            reason?: string;
            feedback?: string;
            comment?: string;
          };
        };
        const userId = subData.metadata?.userId;
        const cancellationDetails = subData.cancellation_details;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            cancellation_reason: cancellationDetails?.reason || null,
            cancellation_feedback: cancellationDetails?.feedback || null,
            cancellation_comment: cancellationDetails?.comment || null,
          })
          .eq('provider_subscription_id', subData.id);

        // Downgrade user role
        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);

          // Track subscription cancellation with amount
          const { data: cancelledSubRaw } = await supabase
            .from('subscriptions')
            .select('plan_id, price_amount')
            .eq('provider_subscription_id', subData.id)
            .single();
          
          const cancelledSub = cancelledSubRaw as { plan_id: string | null; price_amount: number | null } | null;

          trackSubscriptionCancelledServer(userId, {
            planId: cancelledSub?.plan_id || 'unknown',
            provider: 'stripe',
            subscriptionId: subData.id,
            reason: cancellationDetails?.reason,
            amount: cancelledSub?.price_amount ? cancelledSub.price_amount / 100 : undefined,
            comment: cancellationDetails?.comment,
          });

          // Get user email for notification
          const { data: cancelledUserProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', userId)
            .single();

          // Send admin notification for cancellation
          sendPaymentNotification({
            type: 'cancellation',
            userEmail: cancelledUserProfile?.email || 'Unknown',
            amount: cancelledSub?.price_amount ? cancelledSub.price_amount / 100 : 0,
            currency: 'USD',
            provider: 'stripe',
            planName: cancelledSub?.plan_id || 'Subscription',
            subscriptionId: subData.id,
            reason: cancellationDetails?.feedback || cancellationDetails?.reason || 'Not specified',
          }).catch(err => console.error('[Stripe Webhook] Failed to send cancellation notification:', err));
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as unknown as {
          id: string;
          subscription?: string;
          customer?: string;
          amount_paid: number;
          currency: string;
          billing_reason?: string;
          lines?: {
            data: Array<{
              description?: string;
              price?: { id: string };
            }>;
          };
        };

        // Only log renewal payments, not initial subscription
        if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
          // Get user from subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id, plan_id, plan_name')
            .eq('provider_subscription_id', invoice.subscription)
            .single();

          if (sub?.user_id) {
            const amountInDollars = invoice.amount_paid / 100;
            
            // Insert with duplicate prevention
            await insertPaymentHistory(supabase, {
              user_id: sub.user_id,
              transaction_type: 'renewal',
              gateway: 'stripe',
              gateway_identifier: invoice.id,
              gateway_event_id: event.id,
              currency: invoice.currency.toUpperCase(),
              amount: amountInDollars,
              item_name: sub.plan_name || 'Subscription Renewal',
              redirect_status: 'success',
              callback_status: 'success',
              visible_for_user: true,
              metadata: {
                plan_id: sub.plan_id,
                subscription_id: invoice.subscription,
                billing_reason: invoice.billing_reason,
              },
            });

            // Track renewal in Amplitude
            trackSubscriptionRenewalServer(sub.user_id, {
              planId: sub.plan_id || 'unknown',
              amount: amountInDollars,
              provider: 'stripe',
              currency: invoice.currency.toUpperCase(),
              subscriptionId: invoice.subscription,
            });

            // Get user email for notification
            const { data: userProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', sub.user_id)
              .single();

            // Send admin notification for renewal
            sendPaymentNotification({
              type: 'renewal',
              userEmail: userProfile?.email || 'Unknown',
              amount: amountInDollars,
              currency: invoice.currency.toUpperCase(),
              provider: 'stripe',
              planName: sub.plan_name || 'Subscription',
              subscriptionId: invoice.subscription,
              transactionId: invoice.id,
            }).catch(err => console.error('[Stripe Webhook] Failed to send renewal notification:', err));
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoiceData = event.data.object as unknown as {
          id: string;
          subscription?: string;
          customer?: string;
          amount_due: number;
          currency: string;
        };
        
        if (invoiceData.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('provider_subscription_id', invoiceData.subscription);

          // Log failed payment
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('user_id, plan_name, plan_id')
            .eq('provider_subscription_id', invoiceData.subscription)
            .single();

          if (sub?.user_id) {
            // Insert with duplicate prevention
            await insertPaymentHistory(supabase, {
              user_id: sub.user_id,
              transaction_type: 'payment_failed',
              gateway: 'stripe',
              gateway_identifier: invoiceData.id,
              gateway_event_id: event.id,
              currency: invoiceData.currency.toUpperCase(),
              amount: invoiceData.amount_due / 100,
              item_name: sub.plan_name || 'Payment Failed',
              redirect_status: 'failed',
              callback_status: 'failed',
              visible_for_user: true,
              metadata: {
                subscription_id: invoiceData.subscription,
              },
            });

            // Track payment failure with amount
            trackPaymentFailedServer(sub.user_id, {
              planId: sub.plan_id || 'unknown',
              provider: 'stripe',
              amount: invoiceData.amount_due / 100,
              currency: invoiceData.currency.toUpperCase(),
              errorMessage: 'Invoice payment failed',
              subscriptionId: invoiceData.subscription,
            });

            // Get user email for notification
            const { data: failedUserProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', sub.user_id)
              .single();

            // Send admin notification for failed payment
            sendPaymentNotification({
              type: 'payment_failed',
              userEmail: failedUserProfile?.email || 'Unknown',
              amount: invoiceData.amount_due / 100,
              currency: invoiceData.currency.toUpperCase(),
              provider: 'stripe',
              planName: sub.plan_name || 'Subscription',
              subscriptionId: invoiceData.subscription,
            }).catch(err => console.error('[Stripe Webhook] Failed to send payment failed notification:', err));
          }
        }
        break;
      }

      case 'customer.subscription.paused': {
        const subData = event.data.object as unknown as {
          id: string;
          metadata?: { userId?: string };
        };
        const userId = subData.metadata?.userId;

        await supabase
          .from('subscriptions')
          .update({
            status: 'paused',
          })
          .eq('provider_subscription_id', subData.id);

        // Downgrade user role while paused
        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);
        }
        
        console.log(`Subscription paused: ${subData.id}`);
        break;
      }

      case 'customer.subscription.resumed': {
        const subData = event.data.object as unknown as {
          id: string;
          metadata?: { userId?: string };
        };
        const userId = subData.metadata?.userId;

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
          })
          .eq('provider_subscription_id', subData.id);

        // Restore user role
        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', userId);
        }
        
        console.log(`Subscription resumed: ${subData.id}`);
        break;
      }
    }

    // Flush analytics events before returning (important for serverless)
    await flushAmplitude();
    
    return { success: true };
  } catch (error) {
    console.error('[Stripe Webhook] Handler error:', {
      eventId: event.id,
      eventType: event.type,
      error: error instanceof Error ? { message: error.message, name: error.name, stack: error.stack } : error,
    });
    return { success: false, error: error instanceof Error ? error.message : 'Webhook handler failed' };
  }
}

/**
 * Get subscription status for a user
 */
export async function getUserSubscription(userId: string) {
  const supabase = createAdminClient();
  
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return data;
}

