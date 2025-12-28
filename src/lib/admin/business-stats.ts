'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export type DatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface BusinessStats {
  newUsers: number;
  newPaidUsers: number; // First-time subscribers
  renewals: number;     // Recurring payments
  lifetimePurchases: number;
  revenue: number;
  revenueFromNewSubs: number;
  revenueFromRenewals: number;
  revenueFromLifetime: number;
  period: {
    start: string;
    end: string;
  };
}

export interface PlanBreakdown {
  planId: string;
  planName: string;
  count: number;
  mrr: number;
  provider: string;
}

export interface ProviderBreakdown {
  provider: string;
  count: number;
  mrr: number;
}

export interface MRRStats {
  mrr: number;
  activeSubscriptions: number;
  monthlySubscriptions: number;
  lifetimeSubscriptions: number;
  churnRate: number;
  cancelledLast30Days: number;
  // New breakdown fields
  byPlan: PlanBreakdown[];
  byProvider: ProviderBreakdown[];
  stripeMRR: number;
  paypalMRR: number;
  paypalLegacyMRR: number;
}

// Colombia/Bogota timezone (UTC-5)
const TIMEZONE = 'America/Bogota';

function getStartOfDayInColombia(date: Date = new Date()): Date {
  // Get current date in Colombia timezone as YYYY-MM-DD string
  const colombiaStr = date.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  const [year, month, day] = colombiaStr.split('-').map(Number);
  
  // Colombia is UTC-5, so 00:00 Colombia = 05:00 UTC
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));
}

function getDateRange(period: DatePeriod, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  // Get today's start in Colombia timezone (converted to UTC for DB)
  const todayStart = getStartOfDayInColombia(now);
  
  switch (period) {
    case 'today':
      return {
        start: todayStart,
        end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1), // End of today
      };
    case 'yesterday':
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterdayStart,
        end: new Date(todayStart.getTime() - 1), // End of yesterday
      };
    case 'week':
      const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: weekAgo,
        end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case 'month':
      const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        start: monthAgo,
        end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : todayStart,
        end: customEnd ? new Date(customEnd) : new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    default:
      return {
        start: todayStart,
        end: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
  }
}

export async function getBusinessStats(
  period: DatePeriod,
  customStart?: string,
  customEnd?: string
): Promise<BusinessStats> {
  // Prevent stale admin metrics due to Next.js server fetch caching.
  noStore();

  const supabase = createAdminClient();
  const { start, end } = getDateRange(period, customStart, customEnd);
  
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // Run all queries in parallel
  const [
    newUsersResult,
    newSubsResult,
    renewalsResult,
    lifetimeResult,
  ] = await Promise.all([
    // New users created in the period (all signups)
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // New subscriptions (first-time paid users)
    supabase
      .from('payment_history')
      .select('amount, user_id')
      .eq('transaction_type', 'subscription')
      .in('redirect_status', ['success', 'completed'])
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // Renewals
    supabase
      .from('payment_history')
      .select('amount')
      .eq('transaction_type', 'renewal')
      .in('redirect_status', ['success', 'completed'])
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // Lifetime / one-time purchases
    supabase
      .from('payment_history')
      .select('amount')
      .in('transaction_type', ['purchase', 'one_time'])
      .in('redirect_status', ['success', 'completed'])
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  // Calculate revenues by type
  const revenueFromNewSubs = (newSubsResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const revenueFromRenewals = (renewalsResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const revenueFromLifetime = (lifetimeResult.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRevenue = revenueFromNewSubs + revenueFromRenewals + revenueFromLifetime;

  // Count unique new paid users (distinct user_ids from new subscriptions)
  const uniqueNewPaidUsers = new Set((newSubsResult.data || []).map(p => p.user_id)).size;

  return {
    newUsers: newUsersResult.count || 0,
    newPaidUsers: uniqueNewPaidUsers,
    renewals: renewalsResult.data?.length || 0,
    lifetimePurchases: lifetimeResult.data?.length || 0,
    revenue: totalRevenue,
    revenueFromNewSubs,
    revenueFromRenewals,
    revenueFromLifetime,
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
  };
}

// Monthly plan prices for MRR calculation (from legacy AIT Payment Item table)
const MONTHLY_PLAN_PRICES: Record<string, number> = {
  // Current plans
  'monthly': 9.99,
  'monthly_pro': 29.99,
  
  // Legacy plans (from AIT Payment Item CSV)
  'basic plan': 9.99,
  'basic monthly': 9.99,
  'basic': 9.99,
  'standard plan': 19.99,
  'premium plan': 29.99,
  'elite plan': 49.99,
  'extra plan': 99.99,
  'ultimate plan': 149.99,
  'unlimited plan': 14.99,
  'voice cloning': 5.00,
  'monthly pro': 29.99,
  'monthly pro package': 29.99,
  'pro': 29.99,
  'pro monthly': 29.99,
};

// Multi-month plan prices (will be divided by months for MRR)
// Legacy "Pro Annual" / "6 Month Package" = $29.99 per 6 months
const MULTI_MONTH_PLANS: Record<string, { price: number; months: number }> = {
  'pro annual': { price: 29.99, months: 6 },
  '6 month package': { price: 29.99, months: 6 },
  '6 month package (50% off)': { price: 29.99, months: 6 },
};

/**
 * Get MRR (Monthly Recurring Revenue) stats
 * This is independent of the period filter - it's always current
 */
export async function getMRRStats(): Promise<MRRStats> {
  // Prevent stale admin metrics due to Next.js server fetch caching.
  noStore();

  const supabase = createAdminClient();

  // Calculate date 30 days ago for churn calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const now = new Date().toISOString();

  // Run queries in parallel
  const [activeSubsResult, cancelledSubsResult] = await Promise.all([
    // Get all REALLY active subscriptions (status=active AND (period hasn't ended OR lifetime))
    supabase
      .from('subscriptions')
      .select('plan_name, price_amount, plan_id, provider, billing_interval')
      .eq('status', 'active')
      .or(`current_period_end.gt.${now},current_period_end.is.null`),
    
    // Get subscriptions canceled in last 30 days
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('updated_at', thirtyDaysAgo.toISOString()),
  ]);

  const subs = activeSubsResult.data || [];
  const cancelledLast30Days = cancelledSubsResult.count || 0;
  
  // Initialize tracking
  let totalMrr = 0;
  let monthlyCount = 0;
  let lifetimeCount = 0;
  
  // Provider breakdown
  const providerStats: Record<string, { count: number; mrr: number }> = {
    stripe: { count: 0, mrr: 0 },
    paypal: { count: 0, mrr: 0 },
    paypal_legacy: { count: 0, mrr: 0 },
  };
  
  // Plan breakdown
  const planStats: Record<string, { planName: string; count: number; mrr: number; provider: string }> = {};

  for (const sub of subs) {
    const planName = (sub.plan_name || 'Unknown').toLowerCase();
    const planId = (sub.plan_id || 'unknown').toLowerCase();
    const provider = sub.provider || 'unknown';
    const displayPlanName = sub.plan_name || sub.plan_id || 'Unknown Plan';
    
    // Determine billing interval and convert to months
    let effectiveBillingInterval = sub.billing_interval;
    let intervalMonths = 1; // Default to 1 month
    
    // Parse billing interval - handles formats like 'month', '6_month', 'year', etc.
    if (effectiveBillingInterval) {
      // Handle composite intervals like '6_month', '3_month', etc.
      const intervalMatch = effectiveBillingInterval.match(/^(\d+)_?(month|year|week)s?$/i);
      if (intervalMatch) {
        const count = parseInt(intervalMatch[1]);
        const unit = intervalMatch[2].toLowerCase();
        if (unit === 'month') {
          intervalMonths = count;
        } else if (unit === 'year') {
          intervalMonths = count * 12;
        } else if (unit === 'week') {
          intervalMonths = count * 0.25;
        }
      } else if (effectiveBillingInterval === 'year') {
        intervalMonths = 12;
      } else if (effectiveBillingInterval === 'week') {
        intervalMonths = 0.25;
      }
      // 'month' stays as default = 1
    } else {
      // Infer billing interval from plan name for legacy subscriptions with NULL interval
      if (planName.includes('monthly') || planId.includes('monthly')) {
        effectiveBillingInterval = 'month';
        intervalMonths = 1;
      } else if (planName.includes('6 month') || planId.includes('6_month') ||
                 planName.includes('annual') || planId.includes('annual')) {
        effectiveBillingInterval = '6_month';
        intervalMonths = 6;
      } else if (planName.includes('yearly') || planId.includes('yearly')) {
        effectiveBillingInterval = 'year';
        intervalMonths = 12;
      }
    }
    
    // Check if it's a lifetime plan (doesn't count towards MRR)
    // Only treat as lifetime if explicitly named as lifetime/one_time OR
    // if billing_interval is null AND plan name doesn't suggest recurring
    const isLifetime = planName.includes('lifetime') || planId.includes('lifetime') || 
        planName.includes('one_time') || planName.includes('one-time') ||
        (sub.billing_interval === null && !effectiveBillingInterval);
    
    if (isLifetime) {
      lifetimeCount++;
      // Track in plan stats but with 0 MRR
      const key = `${planId}_${provider}`;
      if (!planStats[key]) {
        planStats[key] = { planName: displayPlanName, count: 0, mrr: 0, provider };
      }
      planStats[key].count++;
    } else {
      // It's a recurring subscription
      monthlyCount++;
      
      // Get price - price_amount is stored in CENTS, convert to dollars
      let priceInDollars = sub.price_amount ? sub.price_amount / 100 : 0;
      
      if (priceInDollars === 0) {
        // No price set, use defaults based on plan type
        if (intervalMonths === 6) {
          // 6-month package: $29.99 / 6 months
          priceInDollars = 29.99;
        } else if (intervalMonths === 12) {
          // Yearly plan
          priceInDollars = planName.includes('pro') ? 99.99 : 59.99;
        } else {
          // Monthly plans - use monthly price directly
          priceInDollars = MONTHLY_PLAN_PRICES[planName] || MONTHLY_PLAN_PRICES[planId] || 9.99;
        }
      }
      
      // Convert to monthly MRR based on interval
      if (intervalMonths > 1) {
        priceInDollars = priceInDollars / intervalMonths;
      } else if (intervalMonths < 1) {
        // Weekly billing - multiply to get monthly
        priceInDollars = priceInDollars / intervalMonths;
      }
      
      totalMrr += priceInDollars;
      
      // Track by provider
      if (providerStats[provider]) {
        providerStats[provider].count++;
        providerStats[provider].mrr += priceInDollars;
      }
      
      // Track by plan
      const key = `${planId}_${provider}`;
      if (!planStats[key]) {
        planStats[key] = { planName: displayPlanName, count: 0, mrr: 0, provider };
      }
      planStats[key].count++;
      planStats[key].mrr += priceInDollars;
    }
  }

  // Calculate churn rate: cancelled / (active + cancelled) * 100
  const totalCustomersInPeriod = subs.length + cancelledLast30Days;
  const churnRate = totalCustomersInPeriod > 0 
    ? (cancelledLast30Days / totalCustomersInPeriod) * 100 
    : 0;

  // Convert plan stats to array and sort by MRR
  const byPlan: PlanBreakdown[] = Object.entries(planStats)
    .map(([key, stats]) => ({
      planId: key.split('_')[0],
      planName: stats.planName,
      count: stats.count,
      mrr: stats.mrr,
      provider: stats.provider,
    }))
    .sort((a, b) => b.mrr - a.mrr);

  // Convert provider stats to array
  const byProvider: ProviderBreakdown[] = Object.entries(providerStats)
    .filter(([_, stats]) => stats.count > 0)
    .map(([provider, stats]) => ({
      provider,
      count: stats.count,
      mrr: stats.mrr,
    }))
    .sort((a, b) => b.mrr - a.mrr);

  return {
    mrr: totalMrr,
    activeSubscriptions: subs.length,
    monthlySubscriptions: monthlyCount,
    lifetimeSubscriptions: lifetimeCount,
    churnRate,
    cancelledLast30Days,
    byPlan,
    byProvider,
    stripeMRR: providerStats.stripe.mrr,
    paypalMRR: providerStats.paypal.mrr,
    paypalLegacyMRR: providerStats.paypal_legacy.mrr,
  };
}






