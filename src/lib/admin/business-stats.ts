'use server';

import { createAdminClient } from '@/lib/supabase/server';

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

// Plan prices for MRR calculation (in case price_amount is not set)
const PLAN_PRICES: Record<string, number> = {
  'monthly': 9.99,
  'basic': 9.99,
  'basic plan': 9.99,
  'monthly_pro': 29.99,
  'monthly pro': 29.99,
  'pro': 29.99,
};

/**
 * Get MRR (Monthly Recurring Revenue) stats
 * This is independent of the period filter - it's always current
 */
export async function getMRRStats(): Promise<MRRStats> {
  const supabase = createAdminClient();

  // Get all active subscriptions with their price
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('plan_name, price_amount, plan_id')
    .eq('status', 'active');

  const subs = subscriptions || [];
  
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
      // It's a monthly/recurring subscription
      monthlyCount++;
      
      // Get price - use price_amount if set, otherwise look up from plan name/id
      let price = sub.price_amount || 0;
      if (price === 0) {
        // Try to get price from plan name or plan_id
        price = PLAN_PRICES[planName] || PLAN_PRICES[planId] || 0;
      }
      mrr += price;
    }
  }

  return {
    mrr,
    activeSubscriptions: subs.length,
    monthlySubscriptions: monthlyCount,
    lifetimeSubscriptions: lifetimeCount,
  };
}
