'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export interface MonthlyData {
  month: string; // YYYY-MM format
  label: string; // "Jan 2025" format
  mrr: number;
  newSubscribers: number;
  renewals: number;
  churned: number;
  totalActiveSubscribers: number;
  revenue: number;
  revenueFromNewSubs: number;
  revenueFromRenewals: number;
  revenueFromLifetime: number;
  stripeRevenue: number;
  paypalRevenue: number;
  paypalLegacyRevenue: number;
}

export interface GrowthStats {
  monthlyData: MonthlyData[];
  mrrGrowthRate: number; // % change from first to last month
  subscriberGrowthRate: number;
  avgChurnRate: number;
  ltv: number; // Lifetime value estimate
  arpu: number; // Average revenue per user
}

// Monthly plan prices for MRR calculation
const MONTHLY_PLAN_PRICES: Record<string, number> = {
  'monthly': 9.99,
  'monthly_pro': 29.99,
  'basic plan': 9.99,
  'basic monthly': 9.99,
  'basic': 9.99,
  'pro plan': 29.99,
  'monthly plan': 9.99,
};

/**
 * Get historical monthly stats for the last N months
 */
export async function getHistoricalStats(months: number = 12): Promise<GrowthStats> {
  noStore();
  
  const supabase = createAdminClient();
  const now = new Date();
  const monthlyData: MonthlyData[] = [];
  
  // Generate list of months to query
  const monthsToQuery: { start: Date; end: Date; label: string; key: string }[] = [];
  
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    
    monthsToQuery.push({
      start: date,
      end: new Date(nextMonth.getTime() - 1),
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    });
  }
  
  // Fetch all payments and subscriptions for the period
  const startOfPeriod = monthsToQuery[0].start.toISOString();
  const endOfPeriod = monthsToQuery[monthsToQuery.length - 1].end.toISOString();
  
  const [paymentsResult, subscriptionsResult, cancelledResult] = await Promise.all([
    // Get all payments in period
    supabase
      .from('payment_history')
      .select('amount, transaction_type, gateway, created_at, user_id')
      .in('redirect_status', ['success', 'completed'])
      .gte('created_at', startOfPeriod)
      .lte('created_at', endOfPeriod)
      .order('created_at', { ascending: true }),
    
    // Get all subscriptions created in period
    supabase
      .from('subscriptions')
      .select('id, user_id, plan_name, plan_id, price_amount, provider, billing_interval, status, created_at')
      .gte('created_at', startOfPeriod)
      .lte('created_at', endOfPeriod),
    
    // Get all cancelled subscriptions
    supabase
      .from('subscriptions')
      .select('id, canceled_at, updated_at')
      .eq('status', 'canceled')
      .gte('updated_at', startOfPeriod),
  ]);
  
  const payments = paymentsResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const cancelled = cancelledResult.data || [];
  
  // Get current active subscriptions for baseline
  const { data: activeSubscriptions } = await supabase
    .from('subscriptions')
    .select('id, plan_name, plan_id, price_amount, provider, billing_interval, created_at')
    .eq('status', 'active');
  
  // Process each month
  for (const month of monthsToQuery) {
    const monthStart = month.start.toISOString();
    const monthEnd = month.end.toISOString();
    
    // Filter payments for this month
    const monthPayments = payments.filter(p => {
      if (!p.created_at) return false;
      const date = new Date(p.created_at);
      return date >= month.start && date <= month.end;
    });
    
    // Calculate revenues
    let revenueFromNewSubs = 0;
    let revenueFromRenewals = 0;
    let revenueFromLifetime = 0;
    let stripeRevenue = 0;
    let paypalRevenue = 0;
    let paypalLegacyRevenue = 0;
    const newSubscriberIds = new Set<string>();
    let renewalCount = 0;
    
    for (const payment of monthPayments) {
      const amount = payment.amount || 0;
      
      if (payment.transaction_type === 'subscription') {
        revenueFromNewSubs += amount;
        if (payment.user_id) newSubscriberIds.add(payment.user_id);
      } else if (payment.transaction_type === 'renewal') {
        revenueFromRenewals += amount;
        renewalCount++;
      } else if (['purchase', 'one_time'].includes(payment.transaction_type)) {
        revenueFromLifetime += amount;
      }
      
      if (payment.gateway === 'stripe') {
        stripeRevenue += amount;
      } else if (payment.gateway === 'paypal') {
        paypalRevenue += amount;
      } else if (payment.gateway === 'paypal_legacy') {
        paypalLegacyRevenue += amount;
      }
    }
    
    // Count churned this month
    const monthChurned = cancelled.filter(c => {
      const dateStr = c.canceled_at || c.updated_at;
      if (!dateStr) return false;
      const cancelDate = new Date(dateStr);
      return cancelDate >= month.start && cancelDate <= month.end;
    }).length;
    
    // Calculate MRR for this month
    // Count active subscriptions as of end of month
    const activeAtMonth = (activeSubscriptions || []).filter(sub => {
      if (!sub.created_at) return false;
      const createdAt = new Date(sub.created_at);
      return createdAt <= month.end;
    });
    
    // Subtract those that were cancelled before this month
    const activeCount = activeAtMonth.length;
    
    let mrr = 0;
    for (const sub of activeAtMonth) {
      const planName = (sub.plan_name || '').toLowerCase();
      const planId = (sub.plan_id || '').toLowerCase();
      
      // Skip lifetime plans
      if (planName.includes('lifetime') || planId.includes('lifetime')) continue;
      
      // Determine interval
      let intervalMonths = 1;
      if (!sub.billing_interval) {
        if (planName.includes('annual') || planId.includes('annual')) {
          intervalMonths = 6; // Legacy "annual" is actually 6 months
        }
      } else if (sub.billing_interval === 'year') {
        intervalMonths = 12;
      }
      
      // Get price
      let price = sub.price_amount ? sub.price_amount / 100 : 0;
      if (price === 0) {
        if (intervalMonths === 6) {
          price = 29.99;
        } else {
          price = MONTHLY_PLAN_PRICES[planName] || MONTHLY_PLAN_PRICES[planId] || 9.99;
        }
      }
      
      // Convert to monthly
      if (intervalMonths > 1) {
        price = price / intervalMonths;
      }
      
      mrr += price;
    }
    
    monthlyData.push({
      month: month.key,
      label: month.label,
      mrr,
      newSubscribers: newSubscriberIds.size,
      renewals: renewalCount,
      churned: monthChurned,
      totalActiveSubscribers: activeCount,
      revenue: revenueFromNewSubs + revenueFromRenewals + revenueFromLifetime,
      revenueFromNewSubs,
      revenueFromRenewals,
      revenueFromLifetime,
      stripeRevenue,
      paypalRevenue,
      paypalLegacyRevenue,
    });
  }
  
  // Calculate growth rates
  const firstMonth = monthlyData[0];
  const lastMonth = monthlyData[monthlyData.length - 1];
  
  const mrrGrowthRate = firstMonth.mrr > 0 
    ? ((lastMonth.mrr - firstMonth.mrr) / firstMonth.mrr) * 100 
    : 0;
  
  const subscriberGrowthRate = firstMonth.totalActiveSubscribers > 0
    ? ((lastMonth.totalActiveSubscribers - firstMonth.totalActiveSubscribers) / firstMonth.totalActiveSubscribers) * 100
    : 0;
  
  // Calculate average churn rate
  const totalChurned = monthlyData.reduce((sum, m) => sum + m.churned, 0);
  const avgActiveSubscribers = monthlyData.reduce((sum, m) => sum + m.totalActiveSubscribers, 0) / monthlyData.length;
  const avgChurnRate = avgActiveSubscribers > 0 ? (totalChurned / avgActiveSubscribers / months) * 100 : 0;
  
  // Calculate LTV (simplified: ARPU / monthly churn rate)
  const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
  const arpu = avgActiveSubscribers > 0 ? totalRevenue / avgActiveSubscribers / months : 0;
  const monthlyChurnRate = avgChurnRate / 100;
  const ltv = monthlyChurnRate > 0 ? arpu / monthlyChurnRate : arpu * 24; // Default to 24 months if no churn
  
  return {
    monthlyData,
    mrrGrowthRate,
    subscriberGrowthRate,
    avgChurnRate,
    ltv,
    arpu,
  };
}

/**
 * Get daily stats for the last N days (for more granular view)
 */
export async function getDailyStats(days: number = 30): Promise<{
  dailyData: { date: string; newSignups: number; newPaidUsers: number; revenue: number }[];
}> {
  noStore();
  
  const supabase = createAdminClient();
  const now = new Date();
  const dailyData: { date: string; newSignups: number; newPaidUsers: number; revenue: number }[] = [];
  
  // Use UTC dates to match database timestamps
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  
  // Fetch all data for the period (exclude legacy migrated users)
  const [signupsResult, paymentsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('created_at')
      .eq('is_legacy_user', false) // Only count new signups, not migrated users
      .gte('created_at', startDate.toISOString()),
    
    supabase
      .from('payment_history')
      .select('amount, transaction_type, created_at, user_id')
      .in('redirect_status', ['success', 'completed'])
      .eq('transaction_type', 'subscription')
      .gte('created_at', startDate.toISOString()),
  ]);
  
  const signups = signupsResult.data || [];
  const payments = paymentsResult.data || [];
  
  // Group by day using UTC
  for (let i = days - 1; i >= 0; i--) {
    // Create day boundaries in UTC
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 0, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i, 23, 59, 59, 999));
    const dateStr = dayStart.toISOString().split('T')[0];
    
    const daySignups = signups.filter(s => {
      if (!s.created_at) return false;
      const d = new Date(s.created_at);
      return d >= dayStart && d <= dayEnd;
    }).length;
    
    const dayPayments = payments.filter(p => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      return d >= dayStart && d <= dayEnd;
    });
    
    const newPaidUsers = new Set(dayPayments.map(p => p.user_id)).size;
    const revenue = dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    dailyData.push({
      date: dateStr,
      newSignups: daySignups,
      newPaidUsers,
      revenue,
    });
  }
  
  return { dailyData };
}

