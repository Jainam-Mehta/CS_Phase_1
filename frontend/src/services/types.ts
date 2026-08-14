/**
 * API Response Types
 * TypeScript type definitions for backend API responses
 */

/**
 * Latest sensor reading from backend
 * Updated to support 2 temperature sensors + ambient, 2 humidity sensors + ambient
 * Note: cold_storage_id is a backend API field, refers to site_id in new schema
 */
export interface SensorReading {
  cold_storage_id: string; // Backend API field (refers to site_id)
  temperature_sensor1: number;
  temperature_sensor2: number;
  temperature_avg: number;
  temperature_ambient: number;
  humidity_sensor1: number;
  humidity_sensor2: number;
  humidity_avg: number;
  humidity_ambient: number;
  energy: number;
  energy_generated?: number;
  energy_consumed?: number;
  grid_energy?: number;
  energy_history?: number[]; // Array of energy readings for cumulative calculation
  door_sensor1?: number;
  door_sensor2?: number;
  door_open_duration?: number;
  cumulative_energy?: number;
  energy_generated_today?: number;
  energy_consumed_today?: number;
  grid_energy_today?: number;
  created_at: string;
}

/**
 * Door status from backend
 */
export interface DoorStatus {
  door_1_state: number;
  door_2_state: number;
  door_1_frequency: number;
  door_2_frequency: number;
  door_1_duration: number;
  door_2_duration: number;
  total_duration: number;
  remaining_allowed_duration: number;
  door_alert: boolean;
  threshold_minutes: number;
}

/**
 * Formatted sensor data for display
 * Updated to support 2 temperature sensors + ambient, 2 humidity sensors + ambient
 */
export interface FormattedSensorData {
  coldStorageId: string;
  temperatureSensor1: number;
  temperatureSensor2: number;
  temperatureAvg: number;
  temperature: number; // Average temperature (legacy)
  ambientTemp: number;
  humiditySensor1: number;
  humiditySensor2: number;
  humidityAvg: number;
  humidity: number; // Average humidity (legacy)
  ambientHumidity: number;
  energy: number;
  cumulativeEnergy?: number;
  doorSensor1?: number;
  doorSensor2?: number;
  doorOpenDuration?: number;
  lastUpdated: string;
}

/**
 * Sensor health status
 */
export interface SensorHealth {
  status: 'good' | 'warning' | 'critical' | 'unknown';
  message: string;
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
