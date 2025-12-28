'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { getAutomationStats, runAutomations, getEmailHistory, getConversionStats, type EmailHistoryEntry } from '@/lib/crm/actions';

interface AutomationStat {
  id: string;
  name: string;
  description: string;
  trigger: string;
  enabled: boolean;
  emailsSent: number;
  lastSent: string | null;
}

interface CRMStats {
  automations: AutomationStat[];
  totalEmailsSent: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
}

interface ConversionStat {
  id: string;
  name: string;
  totalSent: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

interface ConversionStats {
  automations: ConversionStat[];
  totalConversions: number;
  totalRevenue: number;
  overallConversionRate: number;
}

// Category colors for visual grouping
const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  onboarding: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: '👋' },
  conversion: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '⚡' },
  retention: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: '💜' },
  engagement: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', icon: '🎉' },
};

function getCategory(automationId: string): keyof typeof categoryColors {
  if (['welcome_free', 'getting_started_tips', 'first_project_reminder'].includes(automationId)) {
    return 'onboarding';
  }
  if (['character_limit_80', 'character_limit_100', 'inactive_7_days', 'inactive_14_days', 'inactive_30_days', 'high_engagement'].includes(automationId)) {
    return 'conversion';
  }
  if (['churn_prevention', 'win_back'].includes(automationId)) {
    return 'retention';
  }
  return 'engagement';
}

function StatCard({ label, value, subLabel, icon }: { label: string; value: number | string; subLabel?: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {subLabel && <p className="text-xs text-slate-500">{subLabel}</p>}
        </div>
      </div>
    </div>
  );
}

function AutomationCard({ automation }: { automation: AutomationStat }) {
  const category = getCategory(automation.id);
  const colors = categoryColors[category];
  
  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className="text-xl">{colors.icon}</span>
          <div>
            <h4 className="font-medium text-white">{automation.name}</h4>
            <p className="text-sm text-slate-400 mt-1">{automation.description}</p>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className="text-slate-500">
                Trigger: <span className={colors.text}>{automation.trigger}</span>
              </span>
              <span className="text-slate-500">
                Sent: <span className="text-white font-medium">{automation.emailsSent}</span>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            automation.enabled 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-slate-700 text-slate-400'
          }`}>
            {automation.enabled ? 'Active' : 'Paused'}
          </span>
        </div>
      </div>
      {automation.lastSent && (
        <p className="text-xs text-slate-500 mt-3">
          Last sent: {new Date(automation.lastSent).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// Tabs for switching between views
type TabType = 'automations' | 'history' | 'conversions';

export function AdminCRMClient() {
  const [activeTab, setActiveTab] = useState<TabType>('automations');
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [runResult, setRunResult] = useState<{
    processed: number;
    emailsSent: number;
    errors: number;
  } | null>(null);

  // Email history state
  const [emailHistory, setEmailHistory] = useState<EmailHistoryEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Conversion stats state
  const [conversionStats, setConversionStats] = useState<ConversionStats | null>(null);
  const [isLoadingConversions, setIsLoadingConversions] = useState(false);

  const loadStats = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getAutomationStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load CRM stats:', error);
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  const loadConversionStats = useCallback(async () => {
    setIsLoadingConversions(true);
    try {
      const data = await getConversionStats();
      setConversionStats(data);
    } catch (error) {
      console.error('Failed to load conversion stats:', error);
    } finally {
      setIsLoadingConversions(false);
    }
  }, []);

  const loadEmailHistory = useCallback(async (page: number, filter: string) => {
    setIsLoadingHistory(true);
    try {
      const data = await getEmailHistory({
        page,
        limit: 20,
        automationFilter: filter,
      });
      setEmailHistory(data.emails);
      setHistoryTotal(data.total);
      setHistoryTotalPages(data.totalPages);
      setHistoryPage(data.page);
    } catch (error) {
      console.error('Failed to load email history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadEmailHistory(historyPage, historyFilter);
    }
  }, [activeTab, historyPage, historyFilter, loadEmailHistory]);

  useEffect(() => {
    if (activeTab === 'conversions') {
      loadConversionStats();
    }
  }, [activeTab, loadConversionStats]);

  const handleRunAutomations = async (dryRun: boolean) => {
    startTransition(async () => {
      try {
        const result = await runAutomations(dryRun);
        setRunResult(result);
        if (!dryRun) {
          loadStats(); // Refresh stats after real run
          if (activeTab === 'history') {
            loadEmailHistory(1, historyFilter);
          }
        }
      } catch (error) {
        console.error('Failed to run automations:', error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  // Group automations by category
  const groupedAutomations = {
    onboarding: stats?.automations.filter(a => getCategory(a.id) === 'onboarding') || [],
    conversion: stats?.automations.filter(a => getCategory(a.id) === 'conversion') || [],
    retention: stats?.automations.filter(a => getCategory(a.id) === 'retention') || [],
    engagement: stats?.automations.filter(a => getCategory(a.id) === 'engagement') || [],
  };

  return (
    <div className="space-y-8">
      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Total Emails Sent" 
          value={stats?.totalEmailsSent || 0} 
          icon="📧"
        />
        <StatCard 
          label="Sent Today" 
          value={stats?.emailsSentToday || 0} 
          icon="📬"
        />
        <StatCard 
          label="Sent This Week" 
          value={stats?.emailsSentThisWeek || 0} 
          icon="📊"
        />
        <StatCard 
          label="Active Automations" 
          value={stats?.automations.filter(a => a.enabled).length || 0} 
          subLabel={`of ${stats?.automations.length || 0} total`}
          icon="⚙️"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('automations')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'automations'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ Automations
          </button>
          <button
            onClick={() => setActiveTab('conversions')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'conversions'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            💰 Conversions
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            📜 Email History
          </button>
        </nav>
      </div>

      {activeTab === 'automations' && (
        <>
          {/* Run Automations Button */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
            <div className="flex-1">
              <h3 className="font-medium text-white">Run Automations</h3>
              <p className="text-sm text-slate-400 mt-1">
                Manually trigger all enabled automations. The daily cron runs automatically at noon UTC.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleRunAutomations(true)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors text-sm"
              >
                {isPending ? 'Running...' : 'Dry Run'}
              </button>
              <button
                onClick={() => handleRunAutomations(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 disabled:opacity-50 transition-colors text-sm"
              >
                {isPending ? 'Running...' : 'Run Now'}
              </button>
            </div>
          </div>

          {/* Run Result */}
          {runResult && (
            <div className={`p-4 rounded-xl border ${
              runResult.errors > 0 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-green-500/10 border-green-500/30'
            }`}>
              <h4 className="font-medium text-white">Automation Run Complete</h4>
              <div className="flex gap-6 mt-2 text-sm">
                <span className="text-slate-400">
                  Processed: <span className="text-white font-medium">{runResult.processed}</span>
                </span>
                <span className="text-slate-400">
                  Emails Sent: <span className="text-green-400 font-medium">{runResult.emailsSent}</span>
                </span>
                {runResult.errors > 0 && (
                  <span className="text-slate-400">
                    Errors: <span className="text-red-400 font-medium">{runResult.errors}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Automations by Category */}
          <div className="space-y-6">
            {/* Onboarding */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-blue-400">👋</span> Onboarding & Activation
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedAutomations.onboarding.map(automation => (
                  <AutomationCard key={automation.id} automation={automation} />
                ))}
              </div>
            </div>

            {/* Conversion */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-amber-400">⚡</span> Conversion & Upgrade
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedAutomations.conversion.map(automation => (
                  <AutomationCard key={automation.id} automation={automation} />
                ))}
              </div>
            </div>

            {/* Retention */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-purple-400">💜</span> Retention & Win-Back
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedAutomations.retention.map(automation => (
                  <AutomationCard key={automation.id} automation={automation} />
                ))}
              </div>
            </div>

            {/* Engagement */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-green-400">🎉</span> Engagement & Milestones
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupedAutomations.engagement.map(automation => (
                  <AutomationCard key={automation.id} automation={automation} />
                ))}
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
            <h3 className="text-lg font-semibold text-white mb-4">📚 How Automations Work</h3>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-sm">
              <div>
                <h4 className="font-medium text-amber-400 mb-2">⏰ Daily Cron</h4>
                <p className="text-slate-400">
                  Automations run daily at noon UTC. The cron job checks all users against automation conditions.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-amber-400 mb-2">🔒 No Duplicates</h4>
                <p className="text-slate-400">
                  Each email is only sent once per user. The system tracks which emails have been sent.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-amber-400 mb-2">🎯 Smart Triggers</h4>
                <p className="text-slate-400">
                  Emails are triggered based on user behavior: signup time, usage, activity, and subscription status.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'conversions' && (
        <div className="space-y-6">
          {isLoadingConversions ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : (
            <>
              {/* Conversion Overview */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="text-sm text-slate-400">Total Conversions</p>
                      <p className="text-3xl font-bold text-white">{conversionStats?.totalConversions || 0}</p>
                      <p className="text-xs text-green-400 mt-1">
                        {conversionStats?.overallConversionRate.toFixed(1)}% conversion rate
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💵</span>
                    <div>
                      <p className="text-sm text-slate-400">Revenue from CRM</p>
                      <p className="text-3xl font-bold text-white">
                        ${(conversionStats?.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-amber-400 mt-1">Attributed to CRM emails</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📧</span>
                    <div>
                      <p className="text-sm text-slate-400">Emails → Paid Users</p>
                      <p className="text-3xl font-bold text-white">
                        {conversionStats?.overallConversionRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Within 30 days of receiving email</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex gap-3">
                  <span className="text-xl">ℹ️</span>
                  <div>
                    <p className="text-sm text-blue-400 font-medium">How conversion tracking works</p>
                    <p className="text-xs text-slate-400 mt-1">
                      When a user becomes a paid subscriber or buys lifetime, we attribute the conversion to any CRM emails they received in the last 30 days. This helps measure which automations are most effective at driving revenue.
                    </p>
                  </div>
                </div>
              </div>

              {/* Conversion by Automation */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">📊 Conversion by Automation</h3>
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-900/80">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Automation
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Sent
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Conversions
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Rate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(conversionStats?.automations || [])
                          .filter(a => a.totalSent > 0)
                          .sort((a, b) => b.conversions - a.conversions)
                          .map((automation) => {
                            const category = getCategory(automation.id);
                            const colors = categoryColors[category];
                            return (
                              <tr key={automation.id} className="hover:bg-slate-900/50">
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.border} border`}>
                                    <span>{colors.icon}</span>
                                    <span className={colors.text}>{automation.name}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-slate-400">
                                  {automation.totalSent.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm font-medium ${automation.conversions > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                    {automation.conversions}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm font-medium ${
                                    automation.conversionRate >= 10 ? 'text-green-400' :
                                    automation.conversionRate >= 5 ? 'text-amber-400' :
                                    automation.conversionRate > 0 ? 'text-slate-300' :
                                    'text-slate-500'
                                  }`}>
                                    {automation.conversionRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`text-sm font-medium ${automation.revenue > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                                    ${automation.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        {(conversionStats?.automations || []).filter(a => a.totalSent > 0).length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                              No emails sent yet. Run automations to start tracking conversions.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tips for improving conversions */}
              <div className="p-6 rounded-xl bg-slate-900/50 border border-slate-800">
                <h3 className="text-lg font-semibold text-white mb-4">💡 Tips for Improving Conversions</h3>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 text-sm">
                  <div>
                    <h4 className="font-medium text-green-400 mb-2">🎯 Focus on High Performers</h4>
                    <p className="text-slate-400">
                      Look at which automations have the highest conversion rates and consider making them more prominent or increasing their frequency.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-400 mb-2">⏰ Timing Matters</h4>
                    <p className="text-slate-400">
                      Users who hit character limits or are highly engaged are prime candidates for upgrades. Make sure these emails are compelling.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-400 mb-2">📝 Test & Iterate</h4>
                    <p className="text-slate-400">
                      Monitor conversion rates over time. If an automation isn&apos;t performing, consider adjusting the email copy or timing.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400">Filter by automation:</label>
              <select
                value={historyFilter}
                onChange={(e) => {
                  setHistoryFilter(e.target.value);
                  setHistoryPage(1);
                }}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Automations</option>
                <optgroup label="Onboarding">
                  <option value="welcome_free">Welcome Email</option>
                  <option value="getting_started_tips">Getting Started Tips</option>
                  <option value="first_project_reminder">First Project Reminder</option>
                </optgroup>
                <optgroup label="Conversion">
                  <option value="character_limit_80">Character Limit 80%</option>
                  <option value="character_limit_100">Character Limit Reached</option>
                  <option value="inactive_7_days">Inactive 7 Days</option>
                  <option value="inactive_14_days">Inactive 14 Days</option>
                  <option value="inactive_30_days">Inactive 30 Days</option>
                  <option value="high_engagement">High Engagement</option>
                </optgroup>
                <optgroup label="Retention">
                  <option value="churn_prevention">Churn Prevention</option>
                  <option value="win_back">Win-Back</option>
                </optgroup>
                <optgroup label="Engagement">
                  <option value="milestone_10">Milestone 10</option>
                  <option value="milestone_50">Milestone 50</option>
                  <option value="milestone_100">Milestone 100</option>
                </optgroup>
              </select>
            </div>
            <span className="text-sm text-slate-400">
              {historyTotal.toLocaleString()} emails total
            </span>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Email Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Sent At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoadingHistory ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : emailHistory.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                        No emails sent yet
                      </td>
                    </tr>
                  ) : (
                    emailHistory.map((email) => {
                      const category = getCategory(email.automation_id);
                      const colors = categoryColors[category];
                      return (
                        <tr key={email.id} className="hover:bg-slate-900/50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-sm text-white">
                                {email.user_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-400">
                                {email.user_email}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.border} border`}>
                              <span>{colors.icon}</span>
                              <span className={colors.text}>{email.automation_name}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-400">
                            <div>
                              <p>{new Date(email.sent_at).toLocaleDateString()}</p>
                              <p className="text-xs text-slate-500">
                                {new Date(email.sent_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Page {historyPage} of {historyTotalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setHistoryPage(p => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={historyPage === 1 || isLoadingHistory}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    setHistoryPage(p => Math.min(historyTotalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  disabled={historyPage === historyTotalPages || isLoadingHistory}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
