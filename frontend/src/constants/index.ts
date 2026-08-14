// API Constants
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || '/ws';
export const API_TIMEOUT = 30000;

// Storage Constants
export const STORAGE_TYPES = {
  COLD_ROOM: 'cold_room',
  DAIRY_COLD_STORAGE: 'dairy_cold_storage',
  TRANSPORT: 'transport',
} as const;

export const STORAGE_STATUS = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
  WARNING: 'warning',
} as const;

// Sensor Constants
export const SENSOR_TYPES = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  PRESSURE: 'pressure',
  OXYGEN: 'oxygen',
  CARBON_DIOXIDE: 'carbon_dioxide',
  AMMONIA: 'ammonia',
  AIR_QUALITY: 'air_quality',
  DOOR_SENSOR: 'door_sensor',
  ENERGY_METER: 'energy_meter',
  VIBRATION: 'vibration',
} as const;

export const SENSOR_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  CALIBRATING: 'calibrating',
  ERROR: 'error',
} as const;

// Alert Constants
export const ALERT_TYPES = {
  TEMPERATURE_THRESHOLD: 'temperature_threshold',
  HUMIDITY_THRESHOLD: 'humidity_threshold',
  SENSOR_OFFLINE: 'sensor_offline',
  DOOR_OPEN: 'door_open',
  ENERGY_ANOMALY: 'energy_anomaly',
  MAINTENANCE_REQUIRED: 'maintenance_required',
  QUALITY_ISSUE: 'quality_issue',
  SECURITY: 'security',
} as const;

export const ALERT_SEVERITY = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export const ALERT_STATUS = {
  OPEN: 'open',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  FARMER: 'farmer',
  STAKEHOLDER: 'stakeholder',
} as const;

// Inventory Constants
export const INVENTORY_STATUS = {
  IN_STORAGE: 'in_storage',
  RESERVED: 'reserved',
  DISPATCHED: 'dispatched',
  EXPIRED: 'expired',
  QUARANTINED: 'quarantined',
} as const;

// Order Constants
export const ORDER_TYPES = {
  INCOMING: 'incoming',
  OUTGOING: 'outgoing',
  TRANSFER: 'transfer',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
} as const;

// Report Constants
export const REPORT_TYPES = {
  INVENTORY: 'inventory',
  MONITORING: 'monitoring',
  ENERGY: 'energy',
  QUALITY: 'quality',
  FINANCIAL: 'financial',
  COMPLIANCE: 'compliance',
  CUSTOM: 'custom',
} as const;

export const REPORT_FORMATS = {
  PDF: 'pdf',
  EXCEL: 'excel',
  CSV: 'csv',
  JSON: 'json',
} as const;

// Widget Constants
export const WIDGET_TYPES = {
  METRIC_CARD: 'metric_card',
  CHART: 'chart',
  TABLE: 'table',
  MAP: 'map',
  ALERT_LIST: 'alert_list',
  STATUS_INDICATOR: 'status_indicator',
  CAMERA_FEED: 'camera_feed',
  CUSTOM: 'custom',
} as const;

export const WIDGET_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  FULL: 'full',
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Refresh Intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  REALTIME: 5000,
  FAST: 15000,
  NORMAL: 30000,
  SLOW: 60000,
  VERY_SLOW: 300000,
} as const;

// Chart Colors
export const CHART_COLORS = {
  PRIMARY: '#0ea5e9',
  ACCENT: '#14b8a6',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#6366f1',
  PURPLE: '#a855f7',
  PINK: '#ec4899',
} as const;

// Temperature Thresholds (Celsius)
export const TEMPERATURE_THRESHOLDS = {
  FREEZING: -18,
  REFRIGERATION: 4,
  COOL: 10,
  AMBIENT: 25,
} as const;

// Humidity Thresholds (Percentage)
export const HUMIDITY_THRESHOLDS = {
  DRY: 30,
  COMFORT: 50,
  HUMID: 70,
} as const;

// Quality Grades
export const QUALITY_GRADES = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
} as const;

// Energy Sources
export const ENERGY_SOURCES = {
  GRID: 'grid',
  SOLAR: 'solar',
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'MMM d, yyyy',
  LONG: 'MMMM d, yyyy',
  TIME: 'h:mm a',
  DATETIME: 'MMM d, yyyy h:mm a',
  ISO: 'yyyy-MM-dd',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'coldsense_theme',
  USER: 'coldsense_user',
  TOKEN: 'coldsense_token',
  PREFERENCES: 'coldsense_preferences',
  SIDEBAR_COLLAPSED: 'coldsense_sidebar_collapsed',
} as const;

// File Size Limits
export const FILE_SIZE_LIMITS = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  VIDEO: 100 * 1024 * 1024, // 100MB
} as const;

// Animation Durations (ms)
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

// Breakpoints (for reference, Tailwind handles this)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;
