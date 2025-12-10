'use client';

import { useState, useEffect, useCallback } from 'react';

interface UsageInfo {
  charactersUsed: number;
  charactersLimit: number;
  charactersRemaining: number;
  percentUsed: number;
  isUnlimited: boolean;
  hasReachedLimit: boolean;
  currentPlan: string;
  planName: string;
  allowedLanguages: string[] | 'all';
}

interface UseUsageReturn {
  usage: UsageInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  checkCanGenerate: (characterCount: number) => Promise<{ allowed: boolean; reason?: string }>;
}

export function useUsage(): UseUsageReturn {
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/usage');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not logged in - set default free plan
          setUsage({
            charactersUsed: 0,
            charactersLimit: 500,
            charactersRemaining: 500,
            percentUsed: 0,
            isUnlimited: false,
            hasReachedLimit: false,
            currentPlan: 'free',
            planName: 'Free',
            allowedLanguages: ['en-US', 'en-GB'],
          });
          return;
        }
        throw new Error('Failed to fetch usage');
      }
      
      const data = await response.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkCanGenerate = useCallback(async (characterCount: number): Promise<{ allowed: boolean; reason?: string }> => {
    try {
      const response = await fetch('/api/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterCount }),
      });
      
      if (!response.ok) {
        return { allowed: false, reason: 'Failed to check usage' };
      }
      
      const result = await response.json();
      
      // Update local usage state
      if (result.usage) {
        setUsage(result.usage);
      }
      
      return { allowed: result.allowed, reason: result.reason };
    } catch {
      return { allowed: false, reason: 'Failed to check usage' };
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    isLoading,
    error,
    refetch: fetchUsage,
    checkCanGenerate,
  };
}

