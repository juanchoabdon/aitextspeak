'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export interface Transaction {
  id: string;
  user_id: string;
  user_email?: string;
  transaction_type: string;
  gateway: string;
  gateway_identifier: string | null;
  currency: string;
  amount: number;
  item_name: string | null;
  redirect_status: string | null;
  callback_status: string | null;
  created_at: string;
  is_legacy: boolean;
}

export interface TransactionStats {
  totalRevenue: number;
  totalTransactions: number;
  stripeRevenue: number;
  stripeCount: number;
  paypalRevenue: number;
  paypalCount: number;
  newSubscriptions: number;
  renewals: number;
  lifetimePurchases: number;
  last30DaysRevenue: number;
}

export interface PaginatedTransactionsResult {
  transactions: Transaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: TransactionStats;
}

export type TransactionFilter = 'all' | 'subscription' | 'renewal' | 'purchase' | 'one_time' | 'payment_failed';
export type GatewayFilter = 'all' | 'stripe' | 'paypal' | 'paypal_legacy';

/**
 * Get paginated transactions with filters
 */
export async function getTransactions(
  page: number = 1,
  pageSize: number = 25,
  filter: TransactionFilter = 'all',
  gateway: GatewayFilter = 'all',
  search: string = ''
): Promise<PaginatedTransactionsResult> {
  noStore();
  
  const supabase = createAdminClient();
  const offset = (page - 1) * pageSize;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Build the query
  let query = supabase
    .from('payment_history')
    .select('id, user_id, transaction_type, gateway, gateway_identifier, currency, amount, item_name, redirect_status, callback_status, created_at, is_legacy', { count: 'exact' })
    .in('redirect_status', ['success', 'completed'])
    .order('created_at', { ascending: false });

  // Apply transaction type filter
  if (filter !== 'all') {
    query = query.eq('transaction_type', filter);
  }

  // Apply gateway filter
  if (gateway !== 'all') {
    query = query.eq('gateway', gateway);
  }

  // Apply pagination
  const { data: transactions, count, error } = await query.range(offset, offset + pageSize - 1);

  if (error) {
    console.error('Error fetching transactions:', error);
    return {
      transactions: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      stats: {
        totalRevenue: 0,
        totalTransactions: 0,
        stripeRevenue: 0,
        stripeCount: 0,
        paypalRevenue: 0,
        paypalCount: 0,
        newSubscriptions: 0,
        renewals: 0,
        lifetimePurchases: 0,
        last30DaysRevenue: 0,
      },
    };
  }

  // Get user emails for the transactions
  const userIds = [...new Set((transactions || []).map(t => t.user_id).filter((id): id is string => id !== null))]
  const userEmails = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds);

    for (const profile of profiles || []) {
      if (profile.email) {
        userEmails.set(profile.id, profile.email);
      }
    }
  }

  // Enrich transactions with user emails
  const enrichedTransactions: Transaction[] = (transactions || []).map(t => ({
    ...t,
    user_email: userEmails.get(t.user_id) || undefined,
  }));

  // Calculate stats (separate queries for accurate totals)
  const [
    totalRevenueResult,
    stripeResult,
    paypalResult,
    subscriptionsResult,
    renewalsResult,
    lifetimeResult,
    last30Result,
  ] = await Promise.all([
    // Total revenue (all successful transactions)
    supabase
      .from('payment_history')
      .select('amount')
      .in('redirect_status', ['success', 'completed'])
      .gt('amount', 0),
    
    // Stripe totals
    supabase
      .from('payment_history')
      .select('amount')
      .eq('gateway', 'stripe')
      .in('redirect_status', ['success', 'completed'])
      .gt('amount', 0),
    
    // PayPal totals
    supabase
      .from('payment_history')
      .select('amount')
      .eq('gateway', 'paypal')
      .in('redirect_status', ['success', 'completed'])
      .gt('amount', 0),
    
    // New subscriptions
    supabase
      .from('payment_history')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_type', 'subscription')
      .in('redirect_status', ['success', 'completed']),
    
    // Renewals
    supabase
      .from('payment_history')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_type', 'renewal')
      .in('redirect_status', ['success', 'completed']),
    
    // Lifetime/one-time purchases
    supabase
      .from('payment_history')
      .select('id', { count: 'exact', head: true })
      .in('transaction_type', ['purchase', 'one_time'])
      .in('redirect_status', ['success', 'completed']),
    
    // Last 30 days revenue
    supabase
      .from('payment_history')
      .select('amount')
      .in('redirect_status', ['success', 'completed'])
      .gte('created_at', thirtyDaysAgo)
      .gt('amount', 0),
  ]);

  const sumAmounts = (data: { amount: number }[] | null) => 
    (data || []).reduce((sum, r) => sum + (r.amount || 0), 0);

  const stats: TransactionStats = {
    totalRevenue: sumAmounts(totalRevenueResult.data),
    totalTransactions: totalRevenueResult.data?.length || 0,
    stripeRevenue: sumAmounts(stripeResult.data),
    stripeCount: stripeResult.data?.length || 0,
    paypalRevenue: sumAmounts(paypalResult.data),
    paypalCount: paypalResult.data?.length || 0,
    newSubscriptions: subscriptionsResult.count || 0,
    renewals: renewalsResult.count || 0,
    lifetimePurchases: lifetimeResult.count || 0,
    last30DaysRevenue: sumAmounts(last30Result.data),
  };

  return {
    transactions: enrichedTransactions,
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
    stats,
  };
}

