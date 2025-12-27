/**
 * Server-side Amplitude tracking
 * Used in API routes and webhooks
 */

import * as amplitude from '@amplitude/analytics-node';
import { Types } from '@amplitude/analytics-node';

const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || '';

let isInitialized = false;

/**
 * Initialize Amplitude for server-side tracking
 */
function initAmplitudeServer() {
  if (isInitialized) {
    return;
  }

  if (!AMPLITUDE_API_KEY) {
    console.warn('[Amplitude Server] NEXT_PUBLIC_AMPLITUDE_API_KEY not set, tracking disabled');
    return;
  }

  console.log('[Amplitude Server] Initializing with API key:', AMPLITUDE_API_KEY.substring(0, 8) + '...');
  
  // Configure for EU Data Center (must match client-side config)
  // Use the proper Types enum for server zone
  amplitude.init(AMPLITUDE_API_KEY, {
    serverZone: Types.ServerZone.EU,
    logLevel: Types.LogLevel.Warn, // Enable warnings for debugging
  });
  
  isInitialized = true;
  console.log('[Amplitude Server] ✅ Initialized successfully for EU data center');
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

  console.log('[Amplitude Server] 📊 Tracking event:', eventName, 'for user:', userId.substring(0, 8) + '...');
  
  try {
    amplitude.track(eventName, eventProperties, { user_id: userId });
    console.log('[Amplitude Server] ✅ Event queued:', eventName);
  } catch (error) {
    console.error('[Amplitude Server] ❌ Error tracking event:', eventName, error);
  }
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

  console.log('[Amplitude Server] 💰 Tracking revenue:', {
    userId: userId.substring(0, 8) + '...',
    productId: properties.productId,
    price: properties.price,
    revenueType: properties.revenueType,
  });

  try {
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
    console.log('[Amplitude Server] ✅ Revenue event queued: $' + properties.price);
  } catch (error) {
    console.error('[Amplitude Server] ❌ Error tracking revenue:', error);
  }
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
 * Track payment completed (for webhooks and immediate activation)
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
  console.log('[Amplitude Server] trackPaymentCompleted called:', {
    userId,
    planId: properties.planId,
    amount: properties.amount,
    provider: properties.provider,
    isRecurring: properties.isRecurring,
  });

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

  // Track specific event based on plan type
  if (properties.planId === 'lifetime') {
    // Lifetime purchase
    trackServerEvent(userId, 'Lifetime Purchased', {
      amount: properties.amount,
      payment_provider: properties.provider,
      currency: properties.currency || 'USD',
    });
  } else if (properties.isRecurring) {
    // Subscription started
    trackServerEvent(userId, 'Subscription Started', {
      plan_id: properties.planId,
      amount: properties.amount,
      payment_provider: properties.provider,
      currency: properties.currency || 'USD',
      subscription_id: properties.subscriptionId,
    });
  }

  // Also track generic Payment Completed for all payments
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
    is_lifetime: properties.planId === 'lifetime',
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

/**
 * Track subscription renewal (for recurring payment webhooks)
 */
export function trackSubscriptionRenewalServer(
  userId: string,
  properties: {
    planId: string;
    amount: number;
    provider: 'stripe' | 'paypal';
    currency?: string;
    subscriptionId?: string;
  }
) {
  console.log('[Amplitude Server] trackSubscriptionRenewalServer called:', {
    userId,
    planId: properties.planId,
    amount: properties.amount,
    provider: properties.provider,
  });

  // Track revenue for the renewal
  trackServerRevenue(userId, {
    productId: properties.planId,
    price: properties.amount,
    quantity: 1,
    revenueType: 'renewal',
    eventProperties: {
      payment_provider: properties.provider,
      currency: properties.currency || 'USD',
      subscription_id: properties.subscriptionId,
    },
  });

  // Track the renewal event
  trackServerEvent(userId, 'Subscription Renewed', {
    plan_id: properties.planId,
    amount: properties.amount,
    payment_provider: properties.provider,
    currency: properties.currency || 'USD',
    subscription_id: properties.subscriptionId,
  });
}

// Flush events before process exits (important for serverless)
export async function flushAmplitude() {
  if (isInitialized) {
    console.log('[Amplitude Server] 🔄 Flushing events...');
    try {
      await amplitude.flush();
      console.log('[Amplitude Server] ✅ Events flushed successfully');
    } catch (error) {
      console.error('[Amplitude Server] ❌ Error flushing events:', error);
    }
  } else {
    console.log('[Amplitude Server] ⚠️ Not initialized, nothing to flush');
  }
}






