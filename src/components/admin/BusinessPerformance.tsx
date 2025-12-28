'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBusinessStats, getMRRStats, type BusinessStats, type MRRStats, type DatePeriod } from '@/lib/admin/business-stats';
import { BusinessCharts } from './BusinessCharts';

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
    <div className={`rounded-2xl border bg-slate-900/50 p-4 sm:p-6 ${colorClasses[color]}`}>
      <p className="text-xs sm:text-sm text-slate-400">{label}</p>
      {loading ? (
        <div className="mt-2 h-7 sm:h-9 w-16 sm:w-24 animate-pulse rounded bg-slate-800" />
      ) : (
        <p className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold text-white">
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
    <div className="space-y-4 sm:space-y-6 md:space-y-8 overflow-hidden">
      {/* Period-Based Stats - First */}
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-white mb-4">Period Performance</h3>
        
        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs sm:text-sm text-slate-400 mr-1 sm:mr-2">Period:</span>
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
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

        {/* Revenue Stats */}
        <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4 sm:p-6">
            <p className="text-xs sm:text-sm text-slate-400">Total Revenue</p>
            {loading ? (
              <div className="mt-2 h-9 w-24 animate-pulse rounded bg-slate-800" />
            ) : (
              <>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-amber-500">
                  ${(stats?.revenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <div className="mt-2 space-y-1 text-[10px] sm:text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>New Subs:</span>
                    <span className="text-green-400">${(stats?.revenueFromNewSubs ?? 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Renewals:</span>
                    <span className="text-blue-400">${(stats?.revenueFromRenewals ?? 0).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Lifetime:</span>
                    <span className="text-purple-400">${(stats?.revenueFromLifetime ?? 0).toFixed(0)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        <StatCard
          label="New Paid Users"
          value={stats?.newPaidUsers ?? 0}
          color="green"
          loading={loading}
        />
        <StatCard
            label="Renewals"
            value={stats?.renewals ?? 0}
          color="blue"
          loading={loading}
        />
          <StatCard
            label="New Signups"
            value={stats?.newUsers ?? 0}
            color="purple"
          loading={loading}
        />
      </div>

        {/* Lifetime Purchases (if any) */}
        {!loading && stats && stats.lifetimePurchases > 0 && (
          <div className="mt-4 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Lifetime Purchases</span>
              <div className="text-right">
                <span className="text-lg font-semibold text-purple-400">{stats.lifetimePurchases}</span>
                <span className="ml-2 text-sm text-slate-500">(${stats.revenueFromLifetime.toFixed(2)})</span>
              </div>
            </div>
          </div>
        )}

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
          <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            <div className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/30">
              <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Avg per New Sub</p>
              <p className="mt-1 text-base sm:text-xl font-semibold text-white">
                ${stats.newPaidUsers > 0 ? (stats.revenueFromNewSubs / stats.newPaidUsers).toFixed(2) : '0.00'}
              </p>
            </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/30">
              <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Avg per Renewal</p>
            <p className="mt-1 text-base sm:text-xl font-semibold text-white">
                ${stats.renewals > 0 ? (stats.revenueFromRenewals / stats.renewals).toFixed(2) : '0.00'}
            </p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/30">
              <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Free Signups</p>
            <p className="mt-1 text-base sm:text-xl font-semibold text-white">
                {Math.max(0, stats.newUsers - stats.newPaidUsers)}
            </p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl border border-slate-800 bg-slate-900/30">
              <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider">Total Transactions</p>
            <p className="mt-1 text-base sm:text-xl font-semibold text-white">
                {stats.newPaidUsers + stats.renewals + stats.lifetimePurchases}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* MRR Section */}
      <div className="rounded-xl sm:rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-1.5 sm:gap-2">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">Monthly Recurring Revenue</span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Current active recurring subscriptions</p>
          </div>
          {mrrLoading ? (
            <div className="h-8 sm:h-10 w-24 sm:w-32 animate-pulse rounded bg-slate-800" />
          ) : (
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-amber-500">
              ${mrrStats?.mrr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
            </p>
          )}
        </div>
        
        {/* Provider Breakdown */}
        {!mrrLoading && mrrStats && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 pt-3 sm:pt-4 border-t border-amber-500/20">
            <div className="text-center p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-purple-500/10 border border-purple-500/20">
              <p className="text-xs sm:text-base md:text-xl font-semibold text-purple-400">
                ${mrrStats.stripeMRR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">Stripe</p>
            </div>
            <div className="text-center p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs sm:text-base md:text-xl font-semibold text-blue-400">
                ${mrrStats.paypalMRR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">PayPal</p>
            </div>
            <div className="text-center p-1.5 sm:p-2 md:p-3 rounded-lg sm:rounded-xl bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs sm:text-base md:text-xl font-semibold text-orange-400">
                ${mrrStats.paypalLegacyMRR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">Legacy</p>
            </div>
          </div>
        )}
        
        {/* Subscription Counts */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-amber-500/20">
          <div className="text-center">
            <p className="text-base sm:text-xl md:text-2xl font-semibold text-white">{mrrLoading ? '-' : mrrStats?.activeSubscriptions ?? 0}</p>
            <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-base sm:text-xl md:text-2xl font-semibold text-green-400">{mrrLoading ? '-' : mrrStats?.monthlySubscriptions ?? 0}</p>
            <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">Recurring</p>
          </div>
          <div className="text-center">
            <p className="text-base sm:text-xl md:text-2xl font-semibold text-purple-400">{mrrLoading ? '-' : mrrStats?.lifetimeSubscriptions ?? 0}</p>
            <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400">Lifetime</p>
          </div>
        </div>

        {/* Churn Rate */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              <span className="text-[10px] sm:text-xs md:text-sm text-slate-400">Churn (30d)</span>
            </div>
            {mrrLoading ? (
              <div className="h-5 sm:h-6 w-12 sm:w-16 animate-pulse rounded bg-slate-800" />
            ) : (
              <div className="text-right">
                <span className={`text-sm sm:text-lg md:text-xl font-semibold ${(mrrStats?.churnRate ?? 0) > 5 ? 'text-red-400' : (mrrStats?.churnRate ?? 0) > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {mrrStats?.churnRate.toFixed(1) ?? '0.0'}%
                </span>
                <p className="text-[9px] sm:text-xs text-slate-500">{mrrStats?.cancelledLast30Days ?? 0} cancelled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plan Breakdown */}
      {!mrrLoading && mrrStats && mrrStats.byPlan.length > 0 && (
        <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            MRR by Plan
          </h3>
          <div className="overflow-x-auto -mx-3 sm:-mx-4 md:mx-0">
            <table className="w-full min-w-[400px] sm:min-w-[500px] md:min-w-0">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="text-left py-2 sm:py-3 px-3 sm:px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Provider</th>
                  <th className="text-center py-2 sm:py-3 px-3 sm:px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Subs</th>
                  <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">MRR</th>
                  <th className="text-right py-2 sm:py-3 px-3 sm:px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mrrStats.byPlan.filter(p => p.mrr > 0).map((plan, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 sm:py-3 px-3 sm:px-4">
                      <span className="text-xs sm:text-sm font-medium text-white">{plan.planName}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${
                        plan.provider === 'stripe' 
                          ? 'bg-purple-500/20 text-purple-400' 
                          : plan.provider === 'paypal_legacy'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {plan.provider === 'paypal_legacy' ? 'Legacy' : plan.provider === 'paypal' ? 'PayPal' : 'Stripe'}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-center">
                      <span className="text-xs sm:text-sm text-slate-300">{plan.count}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right">
                      <span className="text-xs sm:text-sm font-semibold text-green-400">
                        ${plan.mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-3 sm:px-4 text-right">
                      <span className="text-xs sm:text-sm text-slate-400">
                        {mrrStats.mrr > 0 ? ((plan.mrr / mrrStats.mrr) * 100).toFixed(0) : '0'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Lifetime Plans (no MRR) */}
          {mrrStats.byPlan.filter(p => p.mrr === 0).length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">Lifetime Plans (no recurring revenue)</p>
              <div className="flex flex-wrap gap-2">
                {mrrStats.byPlan.filter(p => p.mrr === 0).map((plan, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs bg-slate-800 text-slate-400">
                    {plan.planName}
                    <span className="text-purple-400">({plan.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Provider Breakdown Table */}
      {!mrrLoading && mrrStats && mrrStats.byProvider.length > 0 && (
        <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 p-3 sm:p-4 md:p-6">
          <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-1.5 sm:gap-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Revenue by Provider
          </h3>
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-3">
            {mrrStats.byProvider.map((provider, idx) => {
              const percentage = mrrStats.mrr > 0 ? (provider.mrr / mrrStats.mrr) * 100 : 0;
              const colorClass = provider.provider === 'stripe' 
                ? 'border-purple-500/30 bg-purple-500/5' 
                : provider.provider === 'paypal_legacy'
                  ? 'border-orange-500/30 bg-orange-500/5'
                  : 'border-blue-500/30 bg-blue-500/5';
              const textColor = provider.provider === 'stripe' 
                ? 'text-purple-400' 
                : provider.provider === 'paypal_legacy'
                  ? 'text-orange-400'
                  : 'text-blue-400';
              
              return (
                <div key={idx} className={`rounded-lg sm:rounded-xl border p-2 sm:p-3 md:p-4 ${colorClass}`}>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className={`text-[10px] sm:text-xs md:text-sm font-medium ${textColor}`}>
                      {provider.provider === 'paypal_legacy' ? 'Legacy' : provider.provider === 'paypal' ? 'PayPal' : 'Stripe'}
                    </span>
                    <span className="text-[9px] sm:text-xs text-slate-500">{percentage.toFixed(0)}%</span>
                  </div>
                  <p className="text-base sm:text-xl md:text-2xl font-bold text-white">
                    ${provider.mrr.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">{provider.count} subs</p>
                  {/* Progress bar */}
                  <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        provider.provider === 'stripe' 
                          ? 'bg-purple-500' 
                          : provider.provider === 'paypal_legacy'
                            ? 'bg-orange-500'
                            : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Historical Charts Section */}
      <div className="mt-6 sm:mt-8 md:mt-12 pt-4 sm:pt-6 md:pt-8 border-t border-slate-800">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Growth Analytics
          </h2>
          <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs md:text-sm text-slate-400">Historical trends and growth metrics</p>
        </div>
        <BusinessCharts />
      </div>
    </div>
  );
}






