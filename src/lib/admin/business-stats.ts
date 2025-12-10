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
