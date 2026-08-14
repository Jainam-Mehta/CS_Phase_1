/**
 * Sensor Registry - Single Source of Truth for ColdSense AI Platform
 * 
 * This registry defines all sensor types used across the entire platform:
 * - Owner Setup
 * - Monitoring
 * - Dashboard
 * - AI Engine
 * - Alerts
 * - Reports
 * - MQTT
 * - Analytics
 * - Future IoT deployment
 * 
 * IMPORTANT:
 * - Always use internalKey for backend logic, database operations, and MQTT topics
 * - Only use displayName for UI display purposes
 * - Never use displayName in business logic
 * - Never duplicate this registry elsewhere in the codebase
 */

export type SensorCategory = 
  | 'environmental'
  | 'safety'
  | 'energy'
  | 'security'
  | 'equipment'
  | 'ambient';

export interface SensorDefinition {
  displayName: string;           // Human-readable name for UI display only
  internalKey: string;            // Unique identifier for backend logic, MQTT, database
  defaultIcon: string;            // Icon identifier (lucide-react icon name)
  unit: string;                   // Unit of measurement
  category: SensorCategory;       // Sensor category for grouping and filtering
}

/**
 * Complete Sensor Registry
 * 
 * To add a new sensor:
 * 1. Add entry to this array
 * 2. No other changes needed - automatically available across entire platform
 */
export const SENSOR_REGISTRY: SensorDefinition[] = [
  // Environmental Sensors
  {
    displayName: 'Temperature',
    internalKey: 'temperature',
    defaultIcon: 'thermometer',
    unit: '°C',
    category: 'environmental',
  },
  {
    displayName: 'Humidity',
    internalKey: 'humidity',
    defaultIcon: 'droplets',
    unit: '%',
    category: 'environmental',
  },
  {
    displayName: 'Pressure',
    internalKey: 'pressure',
    defaultIcon: 'gauge',
    unit: 'kPa',
    category: 'environmental',
  },
  {
    displayName: 'Oxygen',
    internalKey: 'oxygen',
    defaultIcon: 'wind',
    unit: '%',
    category: 'environmental',
  },
  {
    displayName: 'Carbon Dioxide',
    internalKey: 'co2',
    defaultIcon: 'cloud',
    unit: 'ppm',
    category: 'environmental',
  },
  {
    displayName: 'Ethylene',
    internalKey: 'ethylene',
    defaultIcon: 'sprout',
    unit: 'ppm',
    category: 'environmental',
  },
  {
    displayName: 'Ammonia',
    internalKey: 'ammonia',
    defaultIcon: 'flask-conical',
    unit: 'ppm',
    category: 'environmental',
  },

  // Safety Sensors
  {
    displayName: 'Water Leakage',
    internalKey: 'water_leak',
    defaultIcon: 'droplet',
    unit: 'Boolean',
    category: 'safety',
  },
  {
    displayName: 'Smoke',
    internalKey: 'smoke',
    defaultIcon: 'flame',
    unit: 'Boolean',
    category: 'safety',
  },

  // Energy Sensors
  {
    displayName: 'Solar',
    internalKey: 'solar',
    defaultIcon: 'sun',
    unit: 'W',
    category: 'energy',
  },
  {
    displayName: 'Battery',
    internalKey: 'battery',
    defaultIcon: 'battery',
    unit: '%',
    category: 'energy',
  },
  {
    displayName: 'Grid Power',
    internalKey: 'grid',
    defaultIcon: 'zap',
    unit: 'W',
    category: 'energy',
  },
  {
    displayName: 'Power Meter',
    internalKey: 'power_meter',
    defaultIcon: 'lightning',
    unit: 'kWh',
    category: 'energy',
  },

  // Security Sensors
  {
    displayName: 'Door',
    internalKey: 'door',
    defaultIcon: 'door-open',
    unit: 'Boolean',
    category: 'security',
  },
  {
    displayName: 'Motion',
    internalKey: 'motion',
    defaultIcon: 'move',
    unit: 'Boolean',
    category: 'security',
  },
  {
    displayName: 'Vibration',
    internalKey: 'vibration',
    defaultIcon: 'activity',
    unit: 'Hz',
    category: 'security',
  },

  // Equipment Sensors
  {
    displayName: 'Compressor',
    internalKey: 'compressor',
    defaultIcon: 'cog',
    unit: 'Status',
    category: 'equipment',
  },

  // Ambient Sensors (external conditions)
  {
    displayName: 'Ambient Temperature',
    internalKey: 'ambient_temperature',
    defaultIcon: 'thermometer-sun',
    unit: '°C',
    category: 'ambient',
  },
  {
    displayName: 'Ambient Humidity',
    internalKey: 'ambient_humidity',
    defaultIcon: 'cloud-sun',
    unit: '%',
    category: 'ambient',
  },
];

/**
 * Helper functions for sensor registry operations
 */

/**
 * Get sensor definition by internal key
 * @param internalKey - The internal key of the sensor
 * @returns Sensor definition or undefined if not found
 */
export function getSensorByInternalKey(internalKey: string): SensorDefinition | undefined {
  return SENSOR_REGISTRY.find(sensor => sensor.internalKey === internalKey);
}

/**
 * Get all sensors in a category
 * @param category - The sensor category
 * @returns Array of sensor definitions in the category
 */
export function getSensorsByCategory(category: SensorCategory): SensorDefinition[] {
  return SENSOR_REGISTRY.filter(sensor => sensor.category === category);
}

/**
 * Get display name for an internal key
 * @param internalKey - The internal key of the sensor
 * @returns Display name or the internal key if not found
 */
export function getDisplayName(internalKey: string): string {
  const sensor = getSensorByInternalKey(internalKey);
  return sensor?.displayName || internalKey;
}

/**
 * Validate internal key exists in registry
 * @param internalKey - The internal key to validate
 * @returns True if the key exists in the registry
 */
export function isValidSensorKey(internalKey: string): boolean {
  return SENSOR_REGISTRY.some(sensor => sensor.internalKey === internalKey);
}

/**
 * Generate MQTT topic for a sensor
 * Format: coldsense/{room_uuid}/{internal_key}/{sensor_index}
 * @param roomUuid - The UUID of the room
 * @param internalKey - The internal key of the sensor
 * @param sensorIndex - The index of the sensor (1-based)
 * @returns MQTT topic string
 */
export function generateMQTTTopic(roomUuid: string, internalKey: string, sensorIndex: number): string {
  return `coldsense/${roomUuid}/${internalKey}/${sensorIndex}`;
}

/**
 * Generate serial number for a sensor
 * Format: SN-{random_6_digits}
 * @returns Serial number string
 */
export function generateSerialNumber(): string {
  return `SN-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Get all internal keys
 * @returns Array of all internal keys
 */
export function getAllInternalKeys(): string[] {
  return SENSOR_REGISTRY.map(sensor => sensor.internalKey);
}

/**
 * Get all categories
 * @returns Array of all unique categories
 */
export function getAllCategories(): SensorCategory[] {
  return Array.from(new Set(SENSOR_REGISTRY.map(sensor => sensor.category)));
}
