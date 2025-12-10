'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBusinessStats, getMRRStats, type BusinessStats, type MRRStats, type DatePeriod } from '@/lib/admin/business-stats';

const periodLabels: Record<DatePeriod, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 Days',
  month: 'Last 30 Days',
  custom: 'Custom',
};

function StatCard({ 
  label, 
  value, 
  prefix = '',
  suffix = '',
  color = 'slate',
  loading = false,
}: { 
  label: string; 
  value: number | string;
  prefix?: string;
  suffix?: string;
  color?: 'slate' | 'amber' | 'green' | 'blue' | 'purple';
  loading?: boolean;
}) {
  const colorClasses = {
    slate: 'border-slate-800',
    amber: 'border-amber-500/30 bg-amber-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    blue: 'border-blue-500/30 bg-blue-500/5',
    purple: 'border-purple-500/30 bg-purple-500/5',
  };

  return (
    <div className={`rounded-2xl border bg-slate-900/50 p-6 ${colorClasses[color]}`}>
      <p className="text-sm text-slate-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-24 animate-pulse rounded bg-slate-800" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-white">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
      )}
    </div>
  );
}

export function BusinessPerformance() {
  const [period, setPeriod] = useState<DatePeriod>('today');
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [mrrStats, setMrrStats] = useState<MRRStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mrrLoading, setMrrLoading] = useState(true);

  // Fetch MRR stats only once (independent of period)
  useEffect(() => {
    async function fetchMRR() {
      setMrrLoading(true);
      try {
        const data = await getMRRStats();
        setMrrStats(data);
      } catch (error) {
        console.error('Failed to fetch MRR stats:', error);
      } finally {
        setMrrLoading(false);
      }
    }
    fetchMRR();
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBusinessStats(period);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch business stats:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const periods: DatePeriod[] = ['today', 'yesterday', 'week', 'month'];

  return (
    <div className="space-y-8">
      {/* MRR Section - Always Current */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Monthly Recurring Revenue
            </h3>
            <p className="text-xs text-slate-400 mt-1">Current active recurring subscriptions</p>
          </div>
          {mrrLoading ? (
            <div className="h-10 w-32 animate-pulse rounded bg-slate-800" />
          ) : (
            <p className="text-4xl font-bold text-amber-500">
              ${mrrStats?.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </p>
          )}
        </div>
        
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-amber-500/20">
          <div className="text-center">
            <p className="text-2xl font-semibold text-white">{mrrLoading ? '-' : mrrStats?.activeSubscriptions ?? 0}</p>
            <p className="text-xs text-slate-400">Active Subs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-green-400">{mrrLoading ? '-' : mrrStats?.monthlySubscriptions ?? 0}</p>
            <p className="text-xs text-slate-400">Monthly</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold text-purple-400">{mrrLoading ? '-' : mrrStats?.lifetimeSubscriptions ?? 0}</p>
            <p className="text-xs text-slate-400">Lifetime</p>
          </div>
        </div>
      </div>

      {/* Period-Based Stats */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Period Performance</h3>
        
        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-400 mr-2">Period:</span>
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p
                ? 'bg-amber-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Date Range Display */}
      {stats && (
        <p className="mt-4 text-sm text-slate-500">
          Showing data from <span className="text-slate-300">{stats.period.start}</span> to{' '}
          <span className="text-slate-300">{stats.period.end}</span>
        </p>
      )}

      {/* Stats Grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Revenue"
          value={stats?.revenue ?? 0}
          prefix="$"
          color="amber"
          loading={loading}
        />
        <StatCard
          label="New Paid Users"
          value={stats?.newPaidUsers ?? 0}
          color="green"
          loading={loading}
        />
        <StatCard
          label="New Users"
          value={stats?.newUsers ?? 0}
          color="blue"
          loading={loading}
        />
      </div>

      {/* Conversion Rate */}
      {stats && stats.newUsers > 0 && (
        <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-900/30">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Conversion Rate (New Users → Paid)</span>
            <span className="text-lg font-semibold text-white">
              {((stats.newPaidUsers / stats.newUsers) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
              style={{ width: `${Math.min((stats.newPaidUsers / stats.newUsers) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Insights */}
      {stats && !loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Avg Revenue per Paid User</p>
            <p className="mt-1 text-xl font-semibold text-white">
              ${stats.newPaidUsers > 0 ? (stats.revenue / stats.newPaidUsers).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Avg Revenue per User</p>
            <p className="mt-1 text-xl font-semibold text-white">
              ${stats.newUsers > 0 ? (stats.revenue / stats.newUsers).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Free Users This Period</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {stats.newUsers - stats.newPaidUsers}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
