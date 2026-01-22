/**
 * Device Fingerprinting Utility
 * 
 * Generates and stores a unique device ID in localStorage to detect
 * users who create multiple free accounts on the same device.
 */

const DEVICE_ID_KEY = 'ats_device_id';
const DEVICE_ACCOUNTS_KEY = 'ats_device_accounts';

/**
 * Generate a random device ID
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}-${randomPart2}`;
}

/**
 * Get the device ID from localStorage, creating one if it doesn't exist
 */
export function getDeviceId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = generateDeviceId();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  } catch {
    // localStorage might be blocked (incognito, etc.)
    return null;
  }
}

/**
 * Track that an account was created on this device
 */
export function trackAccountCreation(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const accounts = getLocalAccountHistory();
    if (!accounts.includes(userId)) {
      accounts.push(userId);
      localStorage.setItem(DEVICE_ACCOUNTS_KEY, JSON.stringify(accounts));
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get list of account IDs created on this device (from localStorage)
 */
export function getLocalAccountHistory(): string[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(DEVICE_ACCOUNTS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // Ignore parse errors
  }
  
  return [];
}

/**
 * Check if multiple accounts have been created on this device
 */
export function hasMultipleAccounts(): boolean {
  return getLocalAccountHistory().length > 1;
}

/**
 * Get number of accounts created on this device
 */
export function getAccountCount(): number {
  return getLocalAccountHistory().length;
}

