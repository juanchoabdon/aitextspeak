/**
 * Server-side Amplitude tracking
 * Used in API routes and webhooks
 */

import * as amplitude from '@amplitude/analytics-node';

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || '';

let isInitialized = false;

/**
 * Initialize Amplitude for server-side tracking
 */
function initAmplitudeServer() {
  if (isInitialized || !AMPLITUDE_API_KEY) {
    return;
  }

  amplitude.init(AMPLITUDE_API_KEY);
  isInitialized = true;
}

/**
 * Track a server-side event
 */
export function trackServerEvent(
  userId: string,
  eventName: string,
  eventProperties?: Record<string, unknown>
) {
  initAmplitudeServer();
  
  if (!isInitialized) {
    console.warn('[Amplitude Server] Not initialized, skipping event:', eventName);
    return;
  }

  amplitude.track(eventName, eventProperties, { user_id: userId });
}

/**
 * Track revenue event server-side (for webhooks)
 */
export function trackServerRevenue(
  userId: string,
  properties: {
    productId: string;      // Plan ID
    price: number;          // Price in dollars
    quantity?: number;
    revenueType?: string;   // 'subscription' | 'purchase'
    eventProperties?: Record<string, unknown>;
  }
) {
  initAmplitudeServer();
  
  if (!isInitialized) {
    console.warn('[Amplitude Server] Not initialized, skipping revenue event');
    return;
  }

  const revenue = new amplitude.Revenue()
    .setProductId(properties.productId)
    .setPrice(properties.price)
    .setQuantity(properties.quantity || 1);

  if (properties.revenueType) {
    revenue.setRevenueType(properties.revenueType);
  }

  if (properties.eventProperties) {
    revenue.setEventProperties(properties.eventProperties as Record<string, string | number | boolean | string[]>);
  }

  amplitude.revenue(revenue, { user_id: userId });
}

/**
 * Identify user server-side
 */
export function identifyServerUser(
  userId: string,
  userProperties: Record<string, unknown>
) {
  initAmplitudeServer();
  
  if (!isInitialized) return;

  const identify = new amplitude.Identify();
  Object.entries(userProperties).forEach(([key, value]) => {
    identify.set(key, value as string | number | boolean | string[]);
  });

  amplitude.identify(identify, { user_id: userId });
}

/**
 * Track payment completed (for webhooks)
 */
export function trackPaymentCompleted(
  userId: string,
  properties: {
    planId: string;
    amount: number;
    provider: 'stripe' | 'paypal';
    isRecurring: boolean;
    currency?: string;
    subscriptionId?: string;
  }
) {
  // Track revenue
  trackServerRevenue(userId, {
    productId: properties.planId,
    price: properties.amount,
    quantity: 1,
    revenueType: properties.isRecurring ? 'subscription' : 'purchase',
    eventProperties: {
      payment_provider: properties.provider,
      currency: properties.currency || 'USD',
      subscription_id: properties.subscriptionId,
    },
  });

  // Track custom event
  trackServerEvent(userId, 'Payment Completed', {
    plan_id: properties.planId,
    amount: properties.amount,
    payment_provider: properties.provider,
    is_recurring: properties.isRecurring,
    currency: properties.currency || 'USD',
    subscription_id: properties.subscriptionId,
  });

  // Update user properties
  identifyServerUser(userId, {
    plan: properties.planId,
    payment_provider: properties.provider,
    last_payment_date: new Date().toISOString(),
  });
}

/**
 * Track subscription activated (for webhooks)
 */
export function trackSubscriptionActivatedServer(
  userId: string,
  properties: {
    planId: string;
    provider: 'stripe' | 'paypal';
    subscriptionId: string;
  }
) {
  trackServerEvent(userId, 'Subscription Activated', {
    plan_id: properties.planId,
    payment_provider: properties.provider,
    subscription_id: properties.subscriptionId,
  });

  identifyServerUser(userId, {
    plan: properties.planId,
    subscription_provider: properties.provider,
    subscription_id: properties.subscriptionId,
    subscription_activated_at: new Date().toISOString(),
  });
}

/**
 * Track subscription cancelled (for webhooks)
 */
export function trackSubscriptionCancelledServer(
  userId: string,
  properties: {
    planId: string;
    provider: 'stripe' | 'paypal';
    subscriptionId: string;
    reason?: string;
  }
) {
  trackServerEvent(userId, 'Subscription Cancelled', {
    plan_id: properties.planId,
    payment_provider: properties.provider,
    subscription_id: properties.subscriptionId,
    cancellation_reason: properties.reason,
  });

  identifyServerUser(userId, {
    plan: 'free',
    subscription_cancelled_at: new Date().toISOString(),
  });
}

/**
 * Track payment failed (for webhooks)
 */
export function trackPaymentFailedServer(
  userId: string,
  properties: {
    planId: string;
    provider: 'stripe' | 'paypal';
    errorMessage: string;
    errorCode?: string;
  }
) {
  trackServerEvent(userId, 'Payment Failed', {
    plan_id: properties.planId,
    payment_provider: properties.provider,
    error_message: properties.errorMessage,
    error_code: properties.errorCode,
  });
}

// Flush events before process exits (important for serverless)
export async function flushAmplitude() {
  if (isInitialized) {
    await amplitude.flush();
  }
}
