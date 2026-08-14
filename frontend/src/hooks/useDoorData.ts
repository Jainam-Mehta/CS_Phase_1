/**
 * Custom hook for fetching and managing door data
 * Provides auto-refresh, loading states, and error handling for door sensors
 */

import { useState, useEffect, useCallback } from 'react';
import { getDoorStatusWithRetry } from '../services/sensorService';
import type { DoorStatus } from '../services/types';

interface UseDoorDataOptions {
  /** Auto-refresh interval in milliseconds (default: 60000ms = 1 minute) */
  refreshInterval?: number;
  /** Enable/disable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000ms) */
  retryDelay?: number;
}

interface UseDoorDataReturn {
  /** Current door status */
  doorStatus: DoorStatus | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Last successful fetch timestamp */
  lastFetchTime: Date | null;
  /** Manual refresh function */
  refresh: () => Promise<void>;
  /** Retry failed request */
  retry: () => Promise<void>;
}

/**
 * Custom hook for managing door data with auto-refresh
 * @param {UseDoorDataOptions} options - Hook configuration options
 * @returns {UseDoorDataReturn} Door data state and control functions
 */
export function useDoorData({
  refreshInterval = 60000,
  autoRefresh = true,
  maxRetries = 3,
  retryDelay = 1000,
}: UseDoorDataOptions = {}): UseDoorDataReturn {
  const [doorStatus, setDoorStatus] = useState<DoorStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  /**
   * Fetches door data from the API
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const status = await getDoorStatusWithRetry(maxRetries, retryDelay);
      setDoorStatus(status);
      setLastFetchTime(new Date());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch door data';
      setError(errorMessage);
      console.error('Door data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [maxRetries, retryDelay]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  /**
   * Retry failed request
   */
  const retry = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []); // Only run on mount

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  return {
    doorStatus,
    isLoading,
    error,
    lastFetchTime,
    refresh,
    retry,
  };
}

export default useDoorData;