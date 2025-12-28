'use server';

import { getAutomationStats as getStats, runAutomations as run } from './automations';

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

