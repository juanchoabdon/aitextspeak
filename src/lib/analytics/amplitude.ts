'use client';

import * as amplitude from '@amplitude/analytics-browser';

// Amplitude configuration
const AMPLITUDE_API_KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || '';

// Set to false to completely disable Amplitude
const AMPLITUDE_ENABLED = true;

// EU Data Center - set to true if your Amplitude project is in EU
const USE_EU_DATA_CENTER = true;

// Session replay - set to false unless enabled in Amplitude dashboard
const ENABLE_SESSION_REPLAY = true;

let isInitialized = false;

/**
 * Initialize Amplitude
 */
export function initAmplitude() {
  // Skip if already initialized, not in browser, or disabled
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  // Check if Amplitude is enabled
  if (!AMPLITUDE_ENABLED) {
    isInitialized = true;
    return;
  }

  // Validate API key (should be 32 characters)
  if (!AMPLITUDE_API_KEY || AMPLITUDE_API_KEY.length < 32) {
    isInitialized = true;
    return;
  }

  try {
    // Initialize Amplitude with minimal logging
    amplitude.init(AMPLITUDE_API_KEY, undefined, {
      defaultTracking: {
        sessions: true,        // Track session start/end
        pageViews: true,       // Track page views automatically
        formInteractions: true, // Track form interactions
        fileDownloads: true,   // Track file downloads
      },
      logLevel: amplitude.Types.LogLevel.None, // Suppress all console logs
      // EU data center configuration
      ...(USE_EU_DATA_CENTER && {
        serverZone: 'EU',
        serverUrl: 'https://api.eu.amplitude.com/2/httpapi',
      }),
    });

    // Session replay (only if enabled in Amplitude dashboard)
    if (ENABLE_SESSION_REPLAY) {
      import('@amplitude/plugin-session-replay-browser').then(({ sessionReplayPlugin }) => {
        try {
          const sessionReplay = sessionReplayPlugin({
            sampleRate: 0.5,
          });
          amplitude.add(sessionReplay);
        } catch {
          // Session replay not available - silently ignore
        }
      }).catch(() => {
        // Module not available - silently ignore
      });
    }

    isInitialized = true;
  } catch {
    // Failed to initialize - silently ignore
    isInitialized = true;
  }
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, eventProperties?: Record<string, unknown>) {
  if (!isInitialized) {
    console.warn('[Amplitude] Not initialized, skipping event:', eventName);
    return;
  }
  amplitude.track(eventName, eventProperties);
}

/**
 * Identify a user
 */
export function identifyUser(userId: string, userProperties?: Record<string, unknown>) {
  if (!isInitialized) {
    console.warn('[Amplitude] Not initialized, skipping identify');
    return;
  }
  
  amplitude.setUserId(userId);
  
  if (userProperties) {
    const identify = new amplitude.Identify();
    Object.entries(userProperties).forEach(([key, value]) => {
      identify.set(key, value as string | number | boolean | string[]);
    });
    amplitude.identify(identify);
  }
}

/**
 * Reset user (on logout)
 */
export function resetUser() {
  if (!isInitialized) return;
  amplitude.reset();
}

/**
 * Track page view manually (for special cases)
 */
export function trackPageView(pageName?: string, pageProperties?: Record<string, unknown>) {
  if (!isInitialized) return;
  
  amplitude.track('Page View', {
    page_name: pageName || document.title,
    page_url: window.location.href,
    page_path: window.location.pathname,
    ...pageProperties,
  });
}

/**
 * Set user properties without changing user ID
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (!isInitialized) return;
  
  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identify.set(key, value as string | number | boolean | string[]);
  });
  amplitude.identify(identify);
}

/**
 * Track revenue event using Amplitude's native Revenue API
 */
export function trackRevenue(properties: {
  productId: string;      // Plan ID (e.g., 'monthly', 'monthly_pro', 'lifetime')
  price: number;          // Price in dollars
  quantity?: number;      // Default 1
  revenueType?: string;   // 'purchase', 'subscription', etc.
  eventProperties?: Record<string, unknown>; // Additional properties
}) {
  if (!isInitialized) {
    console.warn('[Amplitude] Not initialized, skipping revenue event');
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
  
  amplitude.revenue(revenue);
}

// Export amplitude instance for advanced usage
export { amplitude };
