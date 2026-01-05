/**
 * Server-side Amplitude tracking
 * Used in API routes and webhooks
 */

import * as amplitude from '@amplitude/analytics-node';
import { Types } from '@amplitude/analytics-node';

let isInitialized = false;

/**
 * Initialize Amplitude for server-side tracking
 */
function initAmplitudeServer() {
  if (isInitialized) {
    return;
  }

  // Read API key at runtime (not module load time) for serverless compatibility
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || '';

  if (!apiKey) {
    console.warn('[Amplitude Server] ⚠️ NEXT_PUBLIC_AMPLITUDE_API_KEY not set, tracking disabled');
    console.warn('[Amplitude Server] Available env vars:', Object.keys(process.env).filter(k => k.includes('AMPLITUDE')));
    return;
  }

  console.log('[Amplitude Server] Initializing with API key:', apiKey.substring(0, 8) + '...');
  
  try {
    // Configure for EU Data Center (must match client-side config)
    amplitude.init(apiKey, {
      serverZone: Types.ServerZone.EU,
      logLevel: Types.LogLevel.Warn,
    });
    
    isInitialized = true;
    console.log('[Amplitude Server] ✅ Initialized successfully for EU data center');
  } catch (error) {
    console.error('[Amplitude Server] ❌ Failed to initialize:', error);
  }
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
    // Convert properties to simple types that Amplitude accepts
    const cleanProperties: Record<string, string | number | boolean> = {};
    if (eventProperties) {
      for (const [key, value] of Object.entries(eventProperties)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          cleanProperties[key] = value;
        } else {
          cleanProperties[key] = String(value);
        }
      }
    }
    
    amplitude.track(eventName, cleanProperties, { user_id: userId });
    console.log('[Amplitude Server] ✅ Event queued:', eventName, cleanProperties);
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
    
    // Also track as a standard event with $revenue property for better visibility
    amplitude.track('Revenue', {
      $revenue: properties.price,
      $price: properties.price,
      $quantity: properties.quantity || 1,
      $productId: properties.productId,
      $revenueType: properties.revenueType,
      ...properties.eventProperties,
    }, { user_id: userId });
    
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
    provider: 'stripe' | 'paypal' | 'paypal_legacy';
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
    provider: 'stripe' | 'paypal' | 'paypal_legacy';
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
    provider: 'stripe' | 'paypal' | 'paypal_legacy';
    subscriptionId: string;
    reason?: string;
    amount?: number; // Monthly value being lost
    comment?: string;
  }
) {
  console.log('[Amplitude Server] 🚫 Tracking cancellation:', {
    userId: userId.substring(0, 8) + '...',
    planId: properties.planId,
    reason: properties.reason,
    amount: properties.amount,
  });

  // Track negative revenue (churn) if amount provided
  if (properties.amount && properties.amount > 0) {
    trackServerRevenue(userId, {
      productId: properties.planId,
      price: -properties.amount, // Negative to indicate lost revenue
      quantity: 1,
      revenueType: 'churn',
      eventProperties: {
        payment_provider: properties.provider,
        subscription_id: properties.subscriptionId,
        cancellation_reason: properties.reason,
      },
    });
  }

  trackServerEvent(userId, 'Subscription Cancelled', {
    plan_id: properties.planId,
    amount: properties.amount,
    payment_provider: properties.provider,
    subscription_id: properties.subscriptionId,
    cancellation_reason: properties.reason,
    cancellation_comment: properties.comment,
  });

  identifyServerUser(userId, {
    plan: 'free',
    subscription_cancelled_at: new Date().toISOString(),
    cancellation_reason: properties.reason,
  });
}

/**
 * Track payment failed (for webhooks)
 * NOTE: We intentionally do NOT track revenue for failed payments
 * Only track the event for analytics/alerting purposes
 */
export function trackPaymentFailedServer(
  userId: string,
  properties: {
    planId: string;
    provider: 'stripe' | 'paypal' | 'paypal_legacy';
    amount?: number; // Amount that failed to charge (for context, not revenue)
    currency?: string;
    errorMessage: string;
    errorCode?: string;
    subscriptionId?: string;
  }
) {
  console.log('[Amplitude Server] ❌ Tracking payment failed (no revenue):', {
    userId: userId.substring(0, 8) + '...',
    planId: properties.planId,
    amount: properties.amount,
    error: properties.errorMessage,
  });

  // Only track the event - DO NOT track revenue for failed payments
  trackServerEvent(userId, 'Payment Failed', {
    plan_id: properties.planId,
    amount_attempted: properties.amount, // For context only, not revenue
    currency: properties.currency || 'USD',
    payment_provider: properties.provider,
    error_message: properties.errorMessage,
    error_code: properties.errorCode,
    subscription_id: properties.subscriptionId,
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
    provider: 'stripe' | 'paypal' | 'paypal_legacy';
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

// Retry helper for transient network errors
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMsg = lastError?.message || '';
      const isTransient = 
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('fetch failed') ||
        errorMsg.includes('network') ||
        errorMsg.includes('timeout') ||
        errorMsg.includes('socket');
      
      if (!isTransient || attempt === maxRetries) {
        throw lastError;
      }
      
      console.log(`[Amplitude Server] Retry ${attempt}/${maxRetries} after transient error`);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  throw lastError;
}

// Flush events before process exits (important for serverless)
export async function flushAmplitude() {
  if (isInitialized) {
    console.log('[Amplitude Server] 🔄 Flushing events...');
    try {
      await withRetry(async () => {
        const result = amplitude.flush();
        // Handle both sync and async returns from flush
        if (result && typeof result === 'object' && 'promise' in result) {
          await (result as { promise: Promise<void> }).promise;
        }
      });
      console.log('[Amplitude Server] ✅ Events flushed successfully');
    } catch (error) {
      // Log but don't throw - analytics failures shouldn't break the main flow
      console.error('[Amplitude Server] ❌ Error flushing events (non-blocking):', error);
    }
  } else {
    console.log('[Amplitude Server] ⚠️ Not initialized, nothing to flush');
  }
}






