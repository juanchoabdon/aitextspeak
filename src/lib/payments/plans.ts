// Subscription plans configuration
// Active plans available for new users
export type PlanId = 'free' | 'monthly' | 'monthly_pro' | 'lifetime';

// Legacy plans (for existing users only, not shown in pricing)
export type LegacyPlanId = 'pro_annual' | 'basic_annual';

// All plan IDs
export type AllPlanId = PlanId | LegacyPlanId;

export interface Plan {
  id: AllPlanId;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year' | 'one_time' | null;
  features: string[];
  charactersPerMonth: number;
  stripePriceId: string | null;
  paypalPlanId: string | null;
  popular?: boolean;
  allowedLanguages: string[] | 'all'; // Language codes allowed, or 'all' for unlimited
  isLegacy?: boolean; // Hidden from pricing, only for existing subscribers
}

export const PLANS: Record<AllPlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    currency: 'USD',
    interval: null,
    features: [
      '500 characters/month',
      'English voices only',
      'MP3 downloads',
      'Email support',
    ],
    charactersPerMonth: 500,
    stripePriceId: null,
    paypalPlanId: null,
    allowedLanguages: ['en-US', 'en-GB'], // Only English (US) and English (UK)
  },
  monthly: {
    id: 'monthly',
    name: 'Basic Plan',
    description: 'Perfect for content creators',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      '1 Million characters/month',
      'All languages & voices',
      'Priority processing',
      'Commercial license',
      'Cancel Anytime',
    ],
    charactersPerMonth: 1000000,
    // Using most recent Basic Plan price from Stripe
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY || 'price_1Qw4L1H0TRmuwyMeDVGmXbyH',
    paypalPlanId: process.env.PAYPAL_PLAN_MONTHLY || '',
    popular: true,
    allowedLanguages: 'all',
  },
  monthly_pro: {
    id: 'monthly_pro',
    name: 'Monthly Pro',
    description: 'For professionals and teams',
    price: 29.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited characters',
      'All languages & premium voices',
      'Priority processing',
      'Commercial license',
      'Unlimited Storage',
      'Cancel Anytime',
    ],
    charactersPerMonth: -1, // Unlimited
    // Using Monthly Pro Package price from Stripe
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY_PRO || 'price_1KNQX5H0TRmuwyMeu1ksWv1O',
    paypalPlanId: process.env.PAYPAL_PLAN_MONTHLY_PRO || '',
    allowedLanguages: 'all',
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    description: 'One-time payment, forever access',
    price: 99,
    currency: 'USD',
    interval: 'one_time',
    features: [
      'Pay once, Use lifetime',
      'All languages & voices',
      'Unlimited characters',
      'Unlimited Storage',
      'Commercial Rights',
      '30 Day Money Back Guarantee',
    ],
    charactersPerMonth: -1, // Unlimited
    // Lifetime Package - one-time payment
    stripePriceId: process.env.STRIPE_PRICE_LIFETIME || 'price_1SZPRHH0TRmuwyMewRDFh67q',
    paypalPlanId: null, // PayPal doesn't support one-time subscriptions the same way
    allowedLanguages: 'all',
  },

  // ==========================================
  // LEGACY PLANS - Not shown in pricing page
  // Only for existing subscribers
  // ==========================================
  
  // Legacy "Pro Annual" is actually a 6-month package
  pro_annual: {
    id: 'pro_annual',
    name: '6 Month Package',
    description: '6-month pro subscription (Legacy)',
    price: 29.99,
    currency: 'USD',
    interval: 'year', // Keep as 'year' for type compatibility, but it's actually 6 months
    features: [
      '30 Million characters over 6 months',
      'All languages & premium voices',
      'Priority processing',
      'Commercial license',
      'Billed every 6 months',
    ],
    charactersPerMonth: 5000000, // 30M / 6 months
    stripePriceId: null, // Legacy plan
    paypalPlanId: null,
    allowedLanguages: 'all',
    isLegacy: true,
  },
  
  basic_annual: {
    id: 'basic_annual',
    name: 'Basic Annual',
    description: 'Annual basic subscription (Legacy)',
    price: 59.94, // $9.99 × 6 months with discount
    currency: 'USD',
    interval: 'year',
    features: [
      '12 Million characters/year',
      'All languages & voices',
      'Priority processing',
      'Commercial license',
      'Billed annually',
    ],
    charactersPerMonth: 1000000,
    stripePriceId: null, // Legacy plan
    paypalPlanId: null,
    allowedLanguages: 'all',
    isLegacy: true,
  },
};

export function getPlan(planId: AllPlanId): Plan | null {
  return PLANS[planId] || null;
}

/**
 * Get only active plans (not legacy) for pricing page
 */
export function getActivePlans(): Plan[] {
  return Object.values(PLANS).filter(plan => !plan.isLegacy);
}

/**
 * Get plan by name (case-insensitive) - useful for legacy data
 */
export function getPlanByName(name: string): Plan | null {
  const normalizedName = name.toLowerCase().trim();
  
  // Map common legacy names to plan IDs
  const nameMap: Record<string, AllPlanId> = {
    'basic monthly': 'monthly',
    'basic plan': 'monthly',
    'pro monthly': 'monthly_pro',
    'monthly pro': 'monthly_pro',
    'pro annual': 'pro_annual',
    'basic annual': 'basic_annual',
    'lifetime': 'lifetime',
    'free': 'free',
  };
  
  const planId = nameMap[normalizedName];
  if (planId) {
    return PLANS[planId];
  }
  
  // Try direct match
  return Object.values(PLANS).find(p => 
    p.name.toLowerCase() === normalizedName ||
    p.id.toLowerCase() === normalizedName
  ) || null;
}

export function getPlanByStripePrice(priceId: string): Plan | null {
  return Object.values(PLANS).find(p => p.stripePriceId === priceId) || null;
}

export function getPlanByPayPalPlan(planId: string): Plan | null {
  return Object.values(PLANS).find(p => p.paypalPlanId === planId) || null;
}

/**
 * Check if a language is allowed for a specific plan
 */
export function isLanguageAllowed(planId: PlanId, languageCode: string): boolean {
  const plan = PLANS[planId];
  if (!plan) return false;
  
  if (plan.allowedLanguages === 'all') return true;
  
  // Check if language starts with any allowed prefix (e.g., 'en-US', 'en-GB', or just 'en')
  return plan.allowedLanguages.some(allowed => 
    languageCode.toLowerCase().startsWith(allowed.toLowerCase().split('-')[0])
  );
}

/**
 * Get the list of allowed language codes for a plan
 */
export function getAllowedLanguages(planId: PlanId): string[] | 'all' {
  const plan = PLANS[planId];
  return plan?.allowedLanguages || ['en-US', 'en-GB'];
}

