/**
 * Custom hook for fetching and managing sensor data
 * Provides auto-refresh, loading states, and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { getLatestReadingWithRetry, formatSensorData, getSensorHealth } from '../services/sensorService';
import type { FormattedSensorData, SensorHealth } from '../services/types';

interface UseSensorDataOptions {
  /** Auto-refresh interval in milliseconds (default: 60000ms = 1 minute) */
  refreshInterval?: number;
  /** Enable/disable auto-refresh (default: true) */
  autoRefresh?: boolean;
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000ms) */
  retryDelay?: number;
}

interface UseSensorDataReturn {
  /** Current sensor data */
  sensorData: FormattedSensorData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Sensor health status */
  health: SensorHealth;
  /** Last successful fetch timestamp */
  lastFetchTime: Date | null;
  /** Manual refresh function */
  refresh: () => Promise<void>;
  /** Retry failed request */
  retry: () => Promise<void>;
  /** Cumulative energy for today */
  cumulativeEnergy: number;
}

/**
 * Custom hook for managing sensor data with auto-refresh
 * @param {UseSensorDataOptions} options - Hook configuration options
 * @returns {UseSensorDataReturn} Sensor data state and control functions
 */
export function useSensorData({
  refreshInterval = 60000,
  autoRefresh = true,
  maxRetries = 3,
  retryDelay = 1000,
}: UseSensorDataOptions = {}): UseSensorDataReturn {
  const [sensorData, setSensorData] = useState<FormattedSensorData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<SensorHealth>({ status: 'unknown', message: 'No data available' });
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [cumulativeEnergy, setCumulativeEnergy] = useState<number>(0);

  /**
   * Fetches sensor data from the API
   */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const reading = await getLatestReadingWithRetry(maxRetries, retryDelay);
      const formatted = formatSensorData(reading);
      const healthStatus = getSensorHealth(reading);
      
      setSensorData(formatted);
      setHealth(healthStatus);
      setLastFetchTime(new Date());
      setError(null);
      
      // Update cumulative energy
      if (formatted && formatted.cumulativeEnergy) {
        setCumulativeEnergy(formatted.cumulativeEnergy);
      } else if (formatted && formatted.energy) {
        setCumulativeEnergy(formatted.energy);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sensor data';
      setError(errorMessage);
      console.error('Sensor data fetch error:', err);
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
    sensorData,
    isLoading,
    error,
    health,
    lastFetchTime,
    refresh,
    retry,
    cumulativeEnergy,
  };
}

export default useSensorData;
