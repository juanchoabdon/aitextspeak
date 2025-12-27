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

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
      <div className="h-[300px]">
        {children}
      </div>
    </div>
  );
}

function GrowthIndicator({ value, label }: { value: number; label: string }) {
  const isPositive = value >= 0;
  return (
    <div className="text-center p-4 rounded-xl border border-slate-800 bg-slate-900/30">
      <p className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  );
}

export function BusinessCharts() {
  const [stats, setStats] = useState<GrowthStats | null>(null);
  const [dailyData, setDailyData] = useState<{ date: string; newSignups: number; newPaidUsers: number; revenue: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<6 | 12>(12);

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
      <div className="space-y-6">
        <div className="h-[400px] rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[350px] rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
          <div className="h-[350px] rounded-2xl border border-slate-800 bg-slate-900/50 animate-pulse" />
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
    <div className="space-y-8">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">Time Range:</span>
        <button
          onClick={() => setTimeRange(6)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            timeRange === 6 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          6 Months
        </button>
        <button
          onClick={() => setTimeRange(12)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            timeRange === 12 ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          12 Months
        </button>
      </div>

      {/* Growth Indicators */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GrowthIndicator value={stats.mrrGrowthRate} label="MRR Growth" />
        <GrowthIndicator value={stats.subscriberGrowthRate} label="Subscriber Growth" />
        <div className="text-center p-4 rounded-xl border border-slate-800 bg-slate-900/30">
          <p className="text-2xl font-bold text-amber-500">{formatCurrency(stats.arpu)}</p>
          <p className="text-xs text-slate-400 mt-1">ARPU (Monthly)</p>
        </div>
        <div className="text-center p-4 rounded-xl border border-slate-800 bg-slate-900/30">
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(stats.ltv)}</p>
          <p className="text-xs text-slate-400 mt-1">Est. LTV</p>
        </div>
      </div>

      {/* MRR Trend Chart */}
      <ChartCard title="MRR Trend" subtitle="Monthly Recurring Revenue over time">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis 
              tick={{ fill: '#94a3b8', fontSize: 12 }} 
              tickFormatter={(value) => `$${value}`}
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Breakdown */}
        <ChartCard title="Monthly Revenue" subtitle="Revenue breakdown by type">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="revenueFromNewSubs" name="New Subs" stackId="a" fill={COLORS.success} />
              <Bar dataKey="revenueFromRenewals" name="Renewals" stackId="a" fill={COLORS.secondary} />
              <Bar dataKey="revenueFromLifetime" name="Lifetime" stackId="a" fill={COLORS.tertiary} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Subscribers Chart */}
        <ChartCard title="Subscriber Growth" subtitle="New vs Churned subscribers">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="newSubscribers" name="New Subscribers" fill={COLORS.success} />
              <Bar dataKey="churned" name="Churned" fill={COLORS.danger} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Second Row of Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Total Active Subscribers */}
        <ChartCard title="Total Active Subscribers" subtitle="Cumulative subscriber count">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="subscribersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="totalActiveSubscribers"
                name="Active Subscribers"
                stroke={COLORS.secondary}
                fill="url(#subscribersGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Revenue by Provider */}
        <ChartCard title="Revenue by Provider" subtitle={`${lastMonth?.label || 'Current month'}`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={revenueByProvider}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {revenueByProvider.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Daily Signups (Last 30 Days) */}
      <ChartCard title="Daily Activity (Last 30 Days)" subtitle="New signups and paid conversions">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dailyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip 
              content={<CustomTooltip />}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="newSignups" 
              name="Signups" 
              stroke={COLORS.secondary} 
              strokeWidth={2}
              dot={{ fill: COLORS.secondary, r: 3 }}
            />
            <Line 
              type="monotone" 
              dataKey="newPaidUsers" 
              name="New Paid Users" 
              stroke={COLORS.success} 
              strokeWidth={2}
              dot={{ fill: COLORS.success, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Revenue by Provider Over Time */}
      <ChartCard title="Revenue by Provider Over Time" subtitle="Stripe vs PayPal vs PayPal Legacy">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData}>
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
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `$${value}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
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
              name="PayPal Legacy"
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

