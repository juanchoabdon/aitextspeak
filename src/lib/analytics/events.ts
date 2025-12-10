'use client';

import { trackEvent, identifyUser, setUserProperties, resetUser, trackRevenue } from './amplitude';

/**
 * Analytics Events - Common tracking functions
 */

// ==========================================
// ONBOARDING FUNNEL EVENTS
// ==========================================

/**
 * Track when user starts the signup process (lands on signup page)
 */
export function trackSignupStarted(source?: string) {
  trackEvent('Signup Started', {
    source: source || 'direct',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track when signup is completed successfully
 */
export function trackSignupCompleted(userId: string, method: 'email' | 'google', email?: string) {
  // First identify the user
  identifyUser(userId, {
    email,
    signup_method: method,
    signup_date: new Date().toISOString(),
    plan: 'free',
  });
  
  // Then track the event
  trackEvent('Signup Completed', {
    method,
    user_id: userId,
  });
}

/**
 * Track when user starts the login process (lands on login page)
 */
export function trackLoginStarted(source?: string) {
  trackEvent('Login Started', {
    source: source || 'direct',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track when login is completed successfully
 */
export function trackLoginCompleted(userId: string, method: 'email' | 'google', email?: string) {
  // Identify the user on login
  identifyUser(userId, {
    email,
    last_login: new Date().toISOString(),
  });
  
  // Track the event
  trackEvent('Login Completed', {
    method,
    user_id: userId,
  });
}

/**
 * Track signup/login errors
 */
export function trackAuthError(type: 'signup' | 'login', errorMessage: string, method?: 'email' | 'google') {
  trackEvent('Auth Error', {
    auth_type: type,
    error_message: errorMessage,
    method: method || 'email',
  });
}

// ==========================================
// LEGACY USER EVENTS (keeping for compatibility)
// ==========================================

export function trackSignUp(method: 'email' | 'google', userId?: string) {
  trackEvent('Sign Up', {
    method,
    user_id: userId,
  });
}

export function trackSignIn(method: 'email' | 'google') {
  trackEvent('Sign In', { method });
}

export function trackSignOut() {
  trackEvent('Sign Out');
  resetUser();
}

export function identifyLoggedInUser(
  userId: string,
  properties?: {
    email?: string;
    plan?: string;
    created_at?: string;
  }
) {
  identifyUser(userId, properties);
}

// ==========================================
// DEMO EVENTS
// ==========================================

export function trackDemoPlayed(voiceId: string, textLength: number) {
  trackEvent('Demo Played', {
    voice_id: voiceId,
    text_length: textLength,
  });
}

export function trackDemoRateLimited() {
  trackEvent('Demo Rate Limited');
}

// ==========================================
// TTS GENERATION EVENTS
// ==========================================

export function trackTTSGenerated(properties: {
  voiceId: string;
  provider: string;
  characterCount: number;
  projectId?: string;
}) {
  trackEvent('TTS Generated', properties);
}

// ==========================================
// PROJECT EVENTS
// ==========================================

export function trackProjectCreated(projectId: string, projectType?: string) {
  trackEvent('Project Created', {
    project_id: projectId,
    project_type: projectType,
  });
}

export function trackAudioAdded(projectId: string, characterCount: number) {
  trackEvent('Audio Added', {
    project_id: projectId,
    character_count: characterCount,
  });
}

// ==========================================
// SUBSCRIPTION & PAYMENT EVENTS
// ==========================================

export function trackPricingViewed() {
  trackEvent('Pricing Viewed');
}

export function trackPlanSelected(planId: string, price: string) {
  trackEvent('Plan Selected', {
    plan_id: planId,
    price,
  });
}

export function trackCheckoutStarted(planId: string, provider: 'stripe' | 'paypal') {
  trackEvent('Checkout Started', {
    plan_id: planId,
    payment_provider: provider,
  });
}

export function trackCheckoutCompleted(planId: string, provider: 'stripe' | 'paypal') {
  trackEvent('Checkout Completed', {
    plan_id: planId,
    payment_provider: provider,
  });
}

export function trackSubscriptionActivated(planId: string, provider: 'stripe' | 'paypal') {
  trackEvent('Subscription Activated', {
    plan_id: planId,
    payment_provider: provider,
  });
  
  // Update user properties
  setUserProperties({
    plan: planId,
    subscription_provider: provider,
    subscription_activated_at: new Date().toISOString(),
  });
}

/**
 * Track revenue using Amplitude's native Revenue API
 * Call this when a payment is successfully processed
 */
export function trackPaymentRevenue(properties: {
  planId: string;           // e.g., 'monthly', 'monthly_pro', 'lifetime'
  amount: number;           // Price in dollars (e.g., 9.99)
  provider: 'stripe' | 'paypal';
  isRecurring: boolean;     // true for subscriptions, false for one-time
  currency?: string;        // Default USD
}) {
  // Track the revenue event
  trackRevenue({
    productId: properties.planId,
    price: properties.amount,
    quantity: 1,
    revenueType: properties.isRecurring ? 'subscription' : 'purchase',
    eventProperties: {
      payment_provider: properties.provider,
      plan_id: properties.planId,
      currency: properties.currency || 'USD',
      is_recurring: properties.isRecurring,
    },
  });
  
  // Also track a custom event for easier querying
  trackEvent('Payment Completed', {
    plan_id: properties.planId,
    amount: properties.amount,
    payment_provider: properties.provider,
    is_recurring: properties.isRecurring,
    currency: properties.currency || 'USD',
  });
  
  // Update user properties
  setUserProperties({
    plan: properties.planId,
    payment_provider: properties.provider,
    last_payment_date: new Date().toISOString(),
    total_revenue: properties.amount, // Amplitude will track this
  });
}

/**
 * Track payment errors
 */
export function trackPaymentError(properties: {
  planId: string;
  provider: 'stripe' | 'paypal';
  errorMessage: string;
  errorCode?: string;
  step?: 'checkout' | 'processing' | 'confirmation';
}) {
  trackEvent('Payment Error', {
    plan_id: properties.planId,
    payment_provider: properties.provider,
    error_message: properties.errorMessage,
    error_code: properties.errorCode,
    step: properties.step || 'processing',
    timestamp: new Date().toISOString(),
  });
}

// ==========================================
// SERVICE PAGE EVENTS
// ==========================================

export function trackServiceViewed(serviceName: string, serviceSlug: string) {
  trackEvent('Service Page Viewed', {
    service_name: serviceName,
    service_slug: serviceSlug,
  });
}

// ==========================================
// CTA EVENTS
// ==========================================

export function trackCTAClicked(ctaName: string, location: string) {
  trackEvent('CTA Clicked', {
    cta_name: ctaName,
    location,
  });
}

// ==========================================
// ERROR EVENTS
// ==========================================

export function trackError(errorType: string, errorMessage: string, context?: Record<string, unknown>) {
  trackEvent('Error', {
    error_type: errorType,
    error_message: errorMessage,
    ...context,
  });
}
