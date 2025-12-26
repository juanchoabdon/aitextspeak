'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export type DatePeriod = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

export interface BusinessStats {
  newUsers: number;
  newPaidUsers: number;
  revenue: number;
  period: {
    start: string;
    end: string;
  };
}

export interface MRRStats {
  mrr: number;
  activeSubscriptions: number;
  monthlySubscriptions: number;
  lifetimeSubscriptions: number;
  churnRate: number; // Percentage of subscriptions cancelled in last 30 days
  cancelledLast30Days: number;
}

function getDateRange(period: DatePeriod, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1), // End of today
      };
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: new Date(today.getTime() - 1), // End of yesterday
      };
    case 'week':
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return {
        start: weekAgo,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case 'month':
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        start: monthAgo,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : today,
        end: customEnd ? new Date(customEnd) : new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    default:
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
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
  const [newUsersResult, newPaidUsersResult, revenueResult] = await Promise.all([
    // New users created in the period
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // New paid users (subscriptions created in the period)
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('created_at', startISO)
      .lte('created_at', endISO),

    // Revenue from payment_history in the period
    supabase
      .from('payment_history')
      .select('amount')
      .eq('status', 'completed')
      .gte('created_at', startISO)
      .lte('created_at', endISO),
  ]);

  // Calculate total revenue
  const revenue = (revenueResult.data || []).reduce((sum, payment) => {
    return sum + (payment.amount || 0);
  }, 0);

  return {
    newUsers: newUsersResult.count || 0,
    newPaidUsers: newPaidUsersResult.count || 0,
    revenue,
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
      .select('plan_name, price_amount, plan_id')
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
  
  // Calculate MRR - only from recurring subscriptions (monthly plans)
  // Lifetime plans don't contribute to MRR
  let mrr = 0;
  let monthlyCount = 0;
  let lifetimeCount = 0;

  for (const sub of subs) {
    const planName = (sub.plan_name || '').toLowerCase();
    const planId = (sub.plan_id || '').toLowerCase();
    
    // Check if it's a lifetime plan (doesn't count towards MRR)
    if (planName.includes('lifetime') || planId.includes('lifetime') || 
        planName.includes('one_time') || planName.includes('one-time')) {
      lifetimeCount++;
    } else {
      // It's a recurring subscription
      monthlyCount++;
      
      // Check if it's a multi-month plan (annual, 6-month, etc.)
      const multiMonthPlan = MULTI_MONTH_PLANS[planName] || MULTI_MONTH_PLANS[planId];
      
      // Get price - use price_amount if set, otherwise look up from plan name/id
      let price = sub.price_amount || 0;
      
      if (price === 0) {
        if (multiMonthPlan) {
          // Multi-month plans - divide total by months
          price = multiMonthPlan.price / multiMonthPlan.months;
        } else {
          // Monthly plans - use monthly price directly
          price = MONTHLY_PLAN_PRICES[planName] || MONTHLY_PLAN_PRICES[planId] || 9.99;
        }
      } else if (multiMonthPlan) {
        // If price_amount is set but it's multi-month, divide by months
        price = price / multiMonthPlan.months;
      }
      
      mrr += price;
    }
  }

  // Calculate churn rate: cancelled / (active + cancelled) * 100
  // This gives us the % of customers who cancelled out of total customers we had
  const totalCustomersInPeriod = subs.length + cancelledLast30Days;
  const churnRate = totalCustomersInPeriod > 0 
    ? (cancelledLast30Days / totalCustomersInPeriod) * 100 
    : 0;

  return {
    mrr,
    activeSubscriptions: subs.length,
    monthlySubscriptions: monthlyCount,
    lifetimeSubscriptions: lifetimeCount,
    churnRate,
    cancelledLast30Days,
  };
}






