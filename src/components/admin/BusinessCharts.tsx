'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { getHistoricalStats, getDailyStats, type GrowthStats, type MonthlyData } from '@/lib/admin/historical-stats';

const COLORS = {
  primary: '#f59e0b',    // Amber
  secondary: '#3b82f6',  // Blue
  tertiary: '#a855f7',   // Purple
  success: '#22c55e',    // Green
  danger: '#ef4444',     // Red
  stripe: '#635bff',     // Stripe purple
  paypal: '#0070ba',     // PayPal blue
  paypalLegacy: '#f97316', // Orange
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium text-white mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('mrr') || entry.name.toLowerCase().includes('arpu') || entry.name.toLowerCase().includes('ltv')
              ? formatCurrency(entry.value)
              : entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

function ChartCard({ title, subtitle, children, tall = false }: { title: string; subtitle?: string; children: React.ReactNode; tall?: boolean }) {
  return (
    <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="mb-2 sm:mb-4">
        <h3 className="text-xs sm:text-base md:text-lg font-semibold text-white truncate">{title}</h3>
        {subtitle && <p className="text-[9px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1 truncate">{subtitle}</p>}
      </div>
      <div className={tall ? "h-[160px] sm:h-[220px] md:h-[300px]" : "h-[140px] sm:h-[200px] md:h-[300px]"}>
        {children}
      </div>
    </div>
  );
}

function GrowthIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className="text-center p-1.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border border-slate-800 bg-slate-900/30">
      <p className={`text-sm sm:text-xl md:text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
      <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400 mt-0.5 sm:mt-1">{label}</p>
    </div>
  );
}

export function BusinessCharts() {
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [dailyData, setDailyData] = useState<{ date: string; newSignups: number; newPaidUsers: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<3 | 6 | 12>(3);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [historicalData, daily] = await Promise.all([
          getHistoricalStats(timeRange),
          getDailyStats(30),
        ]);
        setStats(historicalData);
        setDailyData(daily.dailyData);
      } catch (error) {
        console.error('Failed to fetch historical stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6 overflow-hidden">
        <div className="h-[120px] sm:h-[180px] md:h-[300px] rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
        <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          <div className="h-[120px] sm:h-[180px] md:h-[300px] rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          <div className="h-[120px] sm:h-[180px] md:h-[300px] rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-slate-400">Failed to load historical data</p>;
  }

  const monthlyData = stats.monthlyData;
  
  // Calculate revenue by provider for pie chart (last month)
  const lastMonth = monthlyData[monthlyData.length - 1];
  const revenueByProvider = [
    { name: 'Stripe', value: lastMonth?.stripeRevenue || 0, color: COLORS.stripe },
    { name: 'PayPal', value: lastMonth?.paypalRevenue || 0, color: COLORS.paypal },
    { name: 'PayPal Legacy', value: lastMonth?.paypalLegacyRevenue || 0, color: COLORS.paypalLegacy },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 overflow-hidden">
      {/* Time Range Selector */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        <span className="text-[10px] sm:text-xs md:text-sm text-slate-400">Range:</span>
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={() => setTimeRange(3)}
            className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all ${
              timeRange === 3 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            3M
          </button>
          <button
            onClick={() => setTimeRange(6)}
            className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all ${
              timeRange === 6 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            6M
          </button>
          <button
            onClick={() => setTimeRange(12)}
            className={`px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-xs md:text-sm font-medium transition-all ${
              timeRange === 12 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            12M
          </button>
        </div>
      </div>

      {/* Growth Indicators */}
      <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4 lg:grid-cols-4">
        <GrowthIndicator value={stats.mrrGrowthRate} label="MRR Growth" />
        <GrowthIndicator value={stats.subscriberGrowthRate} label="Sub Growth" />
        <div className="text-center p-1.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border border-slate-800 bg-slate-900/30">
          <p className="text-sm sm:text-xl md:text-2xl font-bold text-amber-500">{formatCurrency(stats.arpu)}</p>
          <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400 mt-0.5 sm:mt-1">ARPU</p>
        </div>
        <div className="text-center p-1.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl border border-slate-800 bg-slate-900/30">
          <p className="text-sm sm:text-xl md:text-2xl font-bold text-purple-400">{formatCurrency(stats.ltv)}</p>
          <p className="text-[8px] sm:text-[10px] md:text-xs text-slate-400 mt-0.5 sm:mt-1">Est. LTV</p>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <ChartCard title="MRR Trend" subtitle="Monthly Recurring Revenue over time">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis 
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
              tickFormatter={(value) => `$${value}`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="mrr"
              name="MRR"
              stroke={COLORS.primary}
              fill="url(#mrrGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Two Column Charts */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Revenue Breakdown */}
        <ChartCard title="Monthly Revenue" subtitle="Revenue breakdown by type">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(value) => `$${value}`} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="revenueFromNewSubs" name="New" stackId="a" fill={COLORS.success} />
              <Bar dataKey="revenueFromRenewals" name="Renew" stackId="a" fill={COLORS.secondary} />
              <Bar dataKey="revenueFromLifetime" name="Life" stackId="a" fill={COLORS.tertiary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Recurring Subscriber Growth */}
        <ChartCard title="Recurring Subscribers" subtitle="New vs Churned recurring subscriptions">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="newRecurring" name="New" fill={COLORS.success} />
              <Bar dataKey="churned" name="Churned" fill={COLORS.danger} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recurring vs Lifetime Charts */}
      <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Active Recurring Subscribers */}
        <ChartCard title="Active Recurring" subtitle="Cumulative recurring subscribers (contributes to MRR)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="recurringGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="activeRecurring"
                name="Active Recurring"
                stroke={COLORS.success}
                fill="url(#recurringGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Active Lifetime Subscribers */}
        <ChartCard title="Active Lifetime" subtitle="Cumulative lifetime purchases">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="lifetimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.tertiary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.tertiary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="activeLifetime"
                name="Active Lifetime"
                stroke={COLORS.tertiary}
                fill="url(#lifetimeGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Lifetime Growth Chart */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* New Lifetime Purchases */}
        <ChartCard title="Lifetime Purchases" subtitle="New lifetime purchases per month">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="newLifetime" name="New Lifetime" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by Provider */}
        <ChartCard title="Revenue by Provider" subtitle={`${lastMonth?.label || 'Current month'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={revenueByProvider}
                cx="50%"
                cy="45%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                label={false}
              >
                {revenueByProvider.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency((value ?? 0) as number)}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => <span className="text-xs sm:text-sm text-slate-300">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Daily Signups (Last 30 Days) */}
      <ChartCard title="Daily Activity (30 Days)" subtitle="New signups and paid conversions" tall>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dailyData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#94a3b8', fontSize: 9 }} 
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} width={25} />
            <Tooltip 
              content={<CustomTooltip />}
              labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line 
              type="monotone" 
              dataKey="newSignups" 
              name="Signups" 
              stroke={COLORS.secondary} 
              strokeWidth={2}
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="newPaidUsers" 
              name="Paid" 
              stroke={COLORS.success} 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue by Provider Over Time */}
      <ChartCard title="Revenue by Provider" subtitle="Stripe vs PayPal vs Legacy" tall>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="stripeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.stripe} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.stripe} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="paypalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.paypal} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.paypal} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="legacyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.paypalLegacy} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.paypalLegacy} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(value) => `$${value}`} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Area
              type="monotone"
              dataKey="stripeRevenue"
              name="Stripe"
              stroke={COLORS.stripe}
              fill="url(#stripeGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="paypalRevenue"
              name="PayPal"
              stroke={COLORS.paypal}
              fill="url(#paypalGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="paypalLegacyRevenue"
              name="Legacy"
              stroke={COLORS.paypalLegacy}
              fill="url(#legacyGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

