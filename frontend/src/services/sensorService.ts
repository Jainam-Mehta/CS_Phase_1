/**
 * Sensor Service
 * Handles all sensor-related API calls
 */

import { api } from './api';
import type { SensorReading, FormattedSensorData, SensorHealth, DoorStatus } from './types';

/**
 * Fetches the latest sensor reading from the backend
 * @param {number} timeout - Request timeout in milliseconds (default: 5000ms)
 * @returns {Promise<SensorReading>} Latest sensor reading data
 * @throws {Error} If the request fails or times out
 */
export async function getLatestReading(timeout: number = 5000): Promise<SensorReading> {
  try {
    const data = await api.get('/latest-reading', {}, timeout);
    return data;
  } catch (error) {
    console.error('Failed to fetch latest sensor reading:', error);
    throw error;
  }
}

/**
 * Fetches door status from the backend
 * @param {number} timeout - Request timeout in milliseconds (default: 5000ms)
 * @returns {Promise<DoorStatus>} Door status data
 * @throws {Error} If the request fails or times out
 */
export async function getDoorStatus(timeout: number = 5000): Promise<DoorStatus> {
  try {
    const data = await api.get('/door-status', {}, timeout);
    return data;
  } catch (error) {
    console.error('Failed to fetch door status:', error);
    throw error;
  }
}

/**
 * Fetches door status with retry logic
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} retryDelay - Delay between retries in milliseconds (default: 1000ms)
 * @returns {Promise<DoorStatus>} Door status data
 */
export async function getDoorStatusWithRetry(maxRetries: number = 3, retryDelay: number = 1000): Promise<DoorStatus> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getDoorStatus();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Fetches latest reading with retry logic
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} retryDelay - Delay between retries in milliseconds (default: 1000ms)
 * @returns {Promise<SensorReading>} Latest sensor reading data
 */
export async function getLatestReadingWithRetry(maxRetries: number = 3, retryDelay: number = 1000): Promise<SensorReading> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await getLatestReading();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Formats the sensor data for display in the dashboard
 * Updated to support 2 temperature sensors + ambient, 2 humidity sensors + ambient
 * @param {SensorReading} reading - Raw sensor reading from API
 * @returns {FormattedSensorData | null} Formatted sensor data
 */
export function formatSensorData(reading: SensorReading): FormattedSensorData | null {
  if (!reading) return null;
  
  // Calculate cumulative energy if history is provided
  const cumulativeEnergy = reading.energy_history && reading.energy_history.length > 0
    ? reading.energy_history.reduce((sum, val) => sum + val, 0)
    : reading.cumulative_energy || reading.energy || 0;
  
  return {
    coldStorageId: reading.cold_storage_id,
    temperatureSensor1: reading.temperature_sensor1,
    temperatureSensor2: reading.temperature_sensor2,
    temperatureAvg: reading.temperature_avg,
    temperature: reading.temperature_avg, // Legacy support
    ambientTemp: reading.temperature_ambient || 0,
    humiditySensor1: reading.humidity_sensor1 || reading.humidity_avg || 0,
    humiditySensor2: reading.humidity_sensor2 || reading.humidity_avg || 0,
    humidityAvg: reading.humidity_avg || 0,
    humidity: reading.humidity_avg || 0, // Legacy support
    ambientHumidity: reading.humidity_ambient || 0,
    energy: cumulativeEnergy,
    doorSensor1: reading.door_sensor1 || 0,
    doorSensor2: reading.door_sensor2 || 0,
    doorOpenDuration: reading.door_open_duration || 0,
    lastUpdated: reading.created_at,
  };
}

/**
 * Gets sensor health status based on readings
 * @param {SensorReading} reading - Sensor reading data
 * @returns {SensorHealth} Health status with status and message
 */
export function getSensorHealth(reading: SensorReading | null): SensorHealth {
  if (!reading) {
    return { status: 'unknown', message: 'No data available' };
  }

  const { temperature_avg, humidity_avg } = reading;

  // Temperature threshold checks
  if (temperature_avg > 2) {
    return { status: 'critical', message: 'Temperature too high' };
  }
  if (temperature_avg > 0) {
    return { status: 'warning', message: 'Temperature elevated' };
  }

  // Humidity threshold checks
  if (humidity_avg && humidity_avg > 90) {
    return { status: 'warning', message: 'Humidity too high' };
  }
  
  return { status: 'good', message: 'All readings normal' };
}

export default {
  getLatestReading,
  getDoorStatus,
  getDoorStatusWithRetry,
  getLatestReadingWithRetry,
  formatSensorData,
  getSensorHealth,
};
