// Core Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'operator' | 'farmer' | 'stakeholder';
  avatar?: string;
  phone?: string;
  location?: string;
  bio?: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  alerts: boolean;
  reports: boolean;
}

export interface DashboardPreferences {
  layout: 'grid' | 'list';
  widgets: string[];
  refreshInterval: number;
}

// Cold Storage Types
export interface ColdStorage {
  id: string;
  name: string;
  location: Location;
  capacity: StorageCapacity;
  status: StorageStatus;
  type: StorageType;
  metadata: StorageMetadata;
  sensors: Sensor[];
}

export interface Location {
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  timezone: string;
}

export interface StorageCapacity {
  total: number;
  used: number;
  available: number;
  unit: 'metric_tons' | 'cubic_meters' | 'pallets';
}

export type StorageStatus = 'operational' | 'maintenance' | 'offline' | 'warning';

export type StorageType = 'cold_room' | 'dairy_cold_storage' | 'transport';

export interface StorageMetadata {
  createdAt: Date;
  updatedAt: Date;
  owner: string;
  operator: string;
  certification?: string[];
}

// Sensor Types
export interface Sensor {
  id: string;
  name: string;
  type: SensorType;
  location: string;
  status: SensorStatus;
  lastReading?: SensorReading;
  metadata: SensorMetadata;
}

export type SensorType = 
  | 'temperature'
  | 'humidity'
  | 'pressure'
  | 'oxygen'
  | 'carbon_dioxide'
  | 'ammonia'
  | 'air_quality'
  | 'door_sensor'
  | 'energy_meter'
  | 'vibration';

export type SensorStatus = 'Online' | 'Offline' | 'Maintenance' | 'Faulty';

export interface SensorReading {
  value: number;
  unit: string;
  timestamp: Date;
  quality: 'good' | 'uncertain' | 'bad';
}

export interface SensorMetadata {
  model: string;
  manufacturer: string;
  serialNumber: string;
  installationDate: Date;
  calibrationDate?: Date;
  maintenanceInterval: number;
}

// Monitoring Types
export interface MonitoringData {
  sensorId: string;
  readings: SensorReading[];
  alerts: Alert[];
  trends: TrendData[];
}

export interface TrendData {
  timestamp: Date;
  value: number;
  predicted?: number;
  confidence?: number;
}

// Alert Types
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: Date;
  status: AlertStatus;
  metadata?: Record<string, any>;
}

export type AlertType = 
  | 'temperature_threshold'
  | 'humidity_threshold'
  | 'sensor_offline'
  | 'door_open'
  | 'energy_anomaly'
  | 'maintenance_required'
  | 'quality_issue'
  | 'security';

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

// Inventory Types
export interface Inventory {
  id: string;
  productId: string;
  batchNumber: string;
  quantity: number;
  unit: string;
  location: string;
  storageId: string;
  status: InventoryStatus;
  arrivalDate: Date;
  expiryDate?: Date;
  quality?: QualityMetrics;
}

export type InventoryStatus = 'in_storage' | 'reserved' | 'dispatched' | 'expired' | 'quarantined';

export interface QualityMetrics {
  grade: 'A' | 'B' | 'C' | 'D';
  freshness: number;
  condition: string;
  lastInspection: Date;
}

// Market Intelligence Types
export interface MarketPrice {
  commodity: string;
  price: number;
  currency: string;
  unit: string;
  location: string;
  timestamp: Date;
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercent: number;
}

export interface MarketForecast {
  commodity: string;
  forecast: ForecastData[];
  confidence: number;
  factors: string[];
}

export interface ForecastData {
  date: Date;
  predictedPrice: number;
  minPrice: number;
  maxPrice: number;
}

// AI Insights Types
export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  confidence: number;
  impact: ImpactLevel;
  recommendations: Recommendation[];
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type InsightType = 
  | 'predictive_maintenance'
  | 'energy_optimization'
  | 'quality_prediction'
  | 'inventory_optimization'
  | 'market_opportunity'
  | 'risk_assessment';

export type ImpactLevel = 'critical' | 'high' | 'medium' | 'low';

export interface Recommendation {
  action: string;
  priority: number;
  estimatedBenefit: string;
  implementation: string;
}

// Energy Types
export interface EnergyData {
  storageId: string;
  timestamp: Date;
  consumption: number;
  unit: string;
  cost: number;
  source: EnergySource;
  efficiency: number;
}

export type EnergySource = 'grid' | 'solar';

export interface CarbonCredit {
  id: string;
  amount: number;
  unit: string;
  type: 'emission_reduction' | 'carbon_offset';
  timestamp: Date;
  verified: boolean;
  certificate?: string;
}

// Order Types
export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  items: OrderItem[];
  customer: Customer;
  totalAmount: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  deliveryDate?: Date;
}

export type OrderType = 'incoming' | 'outgoing' | 'transfer';

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export interface OrderItem {
  productId: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Customer {
  id: string;
  name: string;
  type: 'farmer' | 'distributor' | 'retailer' | 'processor';
  contact: ContactInfo;
}

export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

// Report Types
export interface Report {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  generatedAt: Date;
  generatedBy: string;
  parameters: ReportParameters;
  url?: string;
}

export type ReportType = 
  | 'inventory'
  | 'monitoring'
  | 'energy'
  | 'quality'
  | 'financial'
  | 'compliance'
  | 'custom';

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json';

export type ReportStatus = 'generating' | 'completed' | 'failed';

export interface ReportParameters {
  startDate: Date;
  endDate: Date;
  filters?: Record<string, any>;
  includeCharts?: boolean;
}

// Finance Types
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  category: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

// Historical Analytics Types
export interface HistoricalData {
  metric: string;
  data: DataPoint[];
  aggregations: Aggregation[];
}

export interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface Aggregation {
  period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  average: number;
  min: number;
  max: number;
  sum: number;
  count: number;
}

// UI Types
export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  size: WidgetSize;
  position: { x: number; y: number };
  config: Record<string, any>;
  refreshInterval?: number;
}

export type WidgetType = 
  | 'metric_card'
  | 'chart'
  | 'table'
  | 'map'
  | 'alert_list'
  | 'status_indicator'
  | 'camera_feed'
  | 'custom';

export type WidgetSize = 'small' | 'medium' | 'large' | 'full';

export interface MetricCard {
  title: string;
  value: number | string;
  unit?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: number;
    period: string;
  };
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Filter and Search Types
export interface FilterOptions {
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  status?: string[];
  type?: string[];
  customFilters?: Record<string, any>;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}
