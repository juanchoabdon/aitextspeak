'use server';

import { 
  getAutomationStats as getStats, 
  runAutomations as run, 
  getEmailHistory as getHistory,
  getConversionStats as getConversions,
  type EmailHistoryEntry,
} from './automations';

// Re-export types
export type { EmailHistoryEntry };

/**
 * Server action to get automation statistics
 */
export async function getAutomationStats() {
  return getStats();
}

/**
 * Server action to run automations
 */
export async function runAutomations(dryRun = false) {
  const result = await run(dryRun);
  // Return only the summary (details can be large)
  return {
    processed: result.processed,
    emailsSent: result.emailsSent,
    errors: result.errors,
  };
}

/**
 * Server action to get email history
 */
export async function getEmailHistory(params: {
  page?: number;
  limit?: number;
  automationFilter?: string;
}) {
  return getHistory(params);
}

/**
 * Server action to get conversion statistics
 */
export async function getConversionStats() {
  return getConversions();
}

