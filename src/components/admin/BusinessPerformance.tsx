'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBusinessStats, type BusinessStats, type DatePeriod } from '@/lib/admin/business-stats';

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
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-6">
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
        <p className="text-sm text-slate-500">
          Showing data from <span className="text-slate-300">{stats.period.start}</span> to{' '}
          <span className="text-slate-300">{stats.period.end}</span>
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
