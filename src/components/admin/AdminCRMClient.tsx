'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import { getAutomationStats, runAutomations } from '@/lib/crm/actions';

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

export function AdminCRMClient() {
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [runResult, setRunResult] = useState<{
    processed: number;
    emailsSent: number;
    errors: number;
  } | null>(null);

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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRunAutomations = async (dryRun: boolean) => {
    startTransition(async () => {
      try {
        const result = await runAutomations(dryRun);
        setRunResult(result);
        if (!dryRun) {
          loadStats(); // Refresh stats after real run
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

      {/* Run Automations Button */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
        <div className="flex-1">
          <h3 className="font-medium text-white">Run Automations</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manually trigger all enabled automations. The daily cron runs automatically at midnight UTC.
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
              Automations run daily at midnight UTC. The cron job checks all users against automation conditions.
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
    </div>
  );
}

