'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { getTransactions, type Transaction, type PaginatedTransactionsResult, type TransactionFilter, type GatewayFilter } from '@/lib/admin/transactions';

function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TransactionTypeBadge({ type }: { type: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    subscription: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'New Sub' },
    renewal: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Renewal' },
    purchase: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Purchase' },
    one_time: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Lifetime' },
    payment_failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
  };

  const { bg, text, label } = config[type] || { bg: 'bg-slate-500/20', text: 'text-slate-400', label: type };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
}

function GatewayBadge({ gateway }: { gateway: string }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    stripe: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '💳' },
    paypal: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '🅿️' },
  };

  const { bg, text, icon } = config[gateway.toLowerCase()] || { bg: 'bg-slate-500/20', text: 'text-slate-400', icon: '💰' };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${bg} ${text}`}>
      {icon} {gateway}
    </span>
  );
}

export function AdminTransactionsClient() {
  const [data, setData] = useState<PaginatedTransactionsResult | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [gateway, setGateway] = useState<GatewayFilter>('all');
  const [isPending, startTransition] = useTransition();

  const pageSize = 25;

  const fetchData = useCallback(async () => {
    startTransition(async () => {
      const result = await getTransactions(page, pageSize, filter, gateway);
      setData(result);
    });
  }, [page, filter, gateway]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filter, gateway]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as TransactionFilter)}
          className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="subscription">New Subscriptions</option>
          <option value="renewal">Renewals</option>
          <option value="purchase">Purchases</option>
          <option value="one_time">Lifetime</option>
          <option value="payment_failed">Failed</option>
        </select>

        <select
          value={gateway}
          onChange={(e) => setGateway(e.target.value as GatewayFilter)}
          className="rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
        >
          <option value="all">All Gateways</option>
          <option value="stripe">Stripe</option>
          <option value="paypal">PayPal</option>
        </select>

        {isPending && (
          <span className="text-slate-400 text-sm">Loading...</span>
        )}
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Gateway
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {data?.transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white truncate max-w-[200px]" title={tx.user_email}>
                      {tx.user_email || tx.user_id?.substring(0, 8) + '...'}
                    </div>
                    {tx.is_legacy && (
                      <span className="text-xs text-slate-500">Legacy</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <TransactionTypeBadge type={tx.transaction_type} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <GatewayBadge gateway={tx.gateway} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {tx.item_name || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className={`text-sm font-medium ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(tx.amount, tx.currency)}
                    </span>
                  </td>
                </tr>
              ))}
              {data?.transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.totalCount)} of {data.totalCount} transactions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isPending}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {data.totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages || isPending}
              className="px-4 py-2 rounded-lg bg-slate-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

