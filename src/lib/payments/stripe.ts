import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { getPlanByStripePrice, PLANS, type PlanId } from './plans';
import {
  trackPaymentCompleted,
  trackSubscriptionActivatedServer,
  trackSubscriptionCancelledServer,
  trackPaymentFailedServer,
  flushAmplitude,
} from '@/lib/analytics/amplitude-server';

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  typescript: true,
});

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
          break;
        }

        const plan = planId ? getPlanByStripePrice(PLANS[planId]?.stripePriceId || '') || PLANS[planId] : null;

        if (session.mode === 'subscription') {
          // Handle subscription
          const subscriptionResponse = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          const subscription = subscriptionResponse as unknown as {
            id: string;
            status: string;
            currency: string;
            current_period_start: number;
            current_period_end: number;
            items: { data: Array<{ price: { id: string; unit_amount: number | null; recurring?: { interval: string } } }> };
          };

          await supabase.from('subscriptions').upsert({
            user_id: userId,
            provider: 'stripe',
            provider_subscription_id: subscription.id,
            provider_customer_id: session.customer as string,
            status: subscription.status as 'active' | 'canceled',
            plan_id: planId,
            plan_name: getPlanByStripePrice(subscription.items.data[0].price.id)?.name || planId,
            price_amount: (subscription.items.data[0].price.unit_amount || 0) / 100,
            price_currency: subscription.currency.toUpperCase(),
            billing_interval: subscription.items.data[0].price.recurring?.interval as 'month' | 'year',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            is_legacy: false,
          }, {
            onConflict: 'user_id,provider',
          });

          // Save transaction to payment_history
          await supabase.from('payment_history').insert({
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

          // Update user role to 'pro'
          await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', userId);

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
        } else {
          // Handle one-time payment (lifetime)
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            provider: 'stripe',
            provider_subscription_id: session.payment_intent as string,
            provider_customer_id: session.customer as string,
            status: 'active',
            plan_id: 'lifetime',
            plan_name: 'Lifetime',
            price_amount: session.amount_total! / 100,
            price_currency: session.currency!.toUpperCase(),
            billing_interval: null,
            is_legacy: false,
          }, {
            onConflict: 'user_id,provider',
          });

          // Save transaction to payment_history
          await supabase.from('payment_history').insert({
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

          // Update user role to 'pro'
          await supabase
            .from('profiles')
            .update({ role: 'pro' })
            .eq('id', userId);

          // Track analytics for lifetime purchase
          trackPaymentCompleted(userId, {
            planId: 'lifetime',
            amount: session.amount_total! / 100,
            provider: 'stripe',
            isRecurring: false,
            currency: session.currency?.toUpperCase() || 'USD',
          });
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
            current_period_start: new Date(subData.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subData.current_period_end * 1000).toISOString(),
            cancel_at: subData.cancel_at 
              ? new Date(subData.cancel_at * 1000).toISOString() 
              : null,
            canceled_at: subData.canceled_at 
              ? new Date(subData.canceled_at * 1000).toISOString() 
              : null,
          })
          .eq('provider_subscription_id', subData.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subData = event.data.object as unknown as {
          id: string;
          metadata?: { userId?: string };
        };
        const userId = subData.metadata?.userId;

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
          })
          .eq('provider_subscription_id', subData.id);

        // Downgrade user role
        if (userId) {
          await supabase
            .from('profiles')
            .update({ role: 'user' })
            .eq('id', userId);

          // Track subscription cancellation
          const { data: cancelledSub } = await supabase
            .from('subscriptions')
            .select('plan_id')
            .eq('provider_subscription_id', subData.id)
            .single();

          trackSubscriptionCancelledServer(userId, {
            planId: cancelledSub?.plan_id || 'unknown',
            provider: 'stripe',
            subscriptionId: subData.id,
          });
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
            await supabase.from('payment_history').insert({
              user_id: sub.user_id,
              transaction_type: 'renewal',
              gateway: 'stripe',
              gateway_identifier: invoice.id,
              gateway_event_id: event.id,
              currency: invoice.currency.toUpperCase(),
              amount: invoice.amount_paid / 100,
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
            .select('user_id, plan_name')
            .eq('provider_subscription_id', invoiceData.subscription)
            .single();

          if (sub?.user_id) {
            await supabase.from('payment_history').insert({
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

            // Track payment failure
            trackPaymentFailedServer(sub.user_id, {
              planId: sub.plan_id || 'unknown',
              provider: 'stripe',
              errorMessage: 'Invoice payment failed',
            });
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
    console.error('Webhook handler error:', error);
    return { success: false, error: 'Webhook handler failed' };
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

