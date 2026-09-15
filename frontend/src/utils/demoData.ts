/**
 * DEMO DATA - ALL HARDCODED FOR QUICK DEMO
 * 
 * This file contains all demo data for both FARMER and OWNER.
 * Once demo is done, revert to querying Supabase.
 * To revert: set DEMO_ENABLED = false and remove all hardcoded logic from pages.
 */

export const DEMO_ENABLED = true;

// ============ TEMPERATURE & HUMIDITY CIRCULAR VALUES (SHARED BY FARMER & OWNER) ============
export const DEMO_TEMP_HUMIDITY_VALUES = [
  { temp: 1.11, hum: 92.23 },
  { temp: 1.12, hum: 92.34 },
  { temp: 1.11, hum: 92.27 },
  { temp: 1.13, hum: 92.45 },
  { temp: 1.12, hum: 92.31 },
  { temp: 1.14, hum: 92.38 },
  { temp: 1.11, hum: 92.42 },
  { temp: 1.12, hum: 92.27 },
  { temp: 1.11, hum: 92.40 },
  { temp: 1.10, hum: 92.34 },
  { temp: 1.11, hum: 92.28 },
  { temp: 1.09, hum: 92.36 },
  { temp: 1.11, hum: 92.34 },
  { temp: 1.13, hum: 92.41 },
  { temp: 1.12, hum: 92.39 }
];

// ============ FARMER DEMO DATA ============

// Door Stats
export const DEMO_DOOR_STATS = {
  status: 'Closed',
  count: 1,
  duration: 0,
  lastOpenTime: 'Today',
  openedTodayCount: 1
};

// Alerts
export const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    created_at: new Date().toISOString(),
    title: '7 kg apples delivered to Apple Studios',
    message: 'Order fulfillment completed successfully',
    type: 'order',
    is_acknowledged: true,
    alert_type: 'order_fulfilled',
    severity: 'info',
    room_id: 'demo-room-1',
    farmer_id: 'demo-farmer-1'
  },
  {
    id: 'demo-alert-2',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    title: 'Temperature increased out of range',
    message: 'Temperature exceeded max range (6°C for apples) for 24 minutes',
    type: 'temperature',
    is_acknowledged: true,
    alert_type: 'temperature_alert',
    severity: 'warning',
    room_id: 'demo-room-1',
    farmer_id: 'demo-farmer-1'
  }
];

// Inventory (Batches) - with farmer names
export const DEMO_INVENTORY = [
  {
    id: 'demo-batch-1',
    batch_code: 'BATCH-1789466259570-205BSI',
    product_name: 'Apple',
    product_id: 'demo-product-1',
    quantity_kg: 75, // 3 crates × 25kg
    stored_date: '2026-09-03',
    remaining_quantity_kg: 75,
    initial_quantity_kg: 75,
    harvest_date: '2026-09-03',
    quality_grade: 'A',
    expiry_date: '2026-03-03',
    farmer_name: 'Roy',
    crates: 3
  },
  {
    id: 'demo-batch-2',
    batch_code: 'BATCH-1789466295723-2XGOBE',
    product_name: 'Apple',
    product_id: 'demo-product-1',
    quantity_kg: 200, // 8 crates × 25kg
    stored_date: '2026-09-15',
    remaining_quantity_kg: 200,
    initial_quantity_kg: 200,
    harvest_date: '2026-09-15',
    quality_grade: 'A',
    expiry_date: '2027-03-15',
    farmer_name: 'Roy',
    crates: 8
  }
];

// Orders
export const DEMO_ORDERS = [
  {
    id: 'demo-order-1',
    batch_id: 'demo-batch-1',
    batch_code: 'BATCH-1789466259570-205BSI',
    quantity_kg: 175,
    selling_price: 45,
    buyer: 'Apple Studios',
    sold_at: new Date().toISOString(),
    total_value: 7875,
    product_name: 'Apple',
    dispatch_date: new Date().toISOString().split('T')[0],
    status: 'Delivered'
  }
];

// Market Prices & Revenue
export const DEMO_MARKET_PRICE = 45;
export const DEMO_REVENUE_EARNED = 7875;

// Energy Data (Farmer)
export const DEMO_ENERGY_DATA = [
  { time: '09/08', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/09', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/10', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/11', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/12', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/13', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/14', value: 756, total_kwh: 756, recorded_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  { time: '09/15', value: 756, total_kwh: 756, recorded_at: new Date().toISOString() }
];

// Products
export const DEMO_PRODUCTS = [
  {
    id: 'demo-product-1',
    name: 'Apple',
    storage_temp_min: 0.0,
    storage_temp_max: 2.0,
    storage_humidity_min: 90.0,
    storage_humidity_max: 95.0,
    shelf_life_days: 180
  }
];

export const DEMO_ACTIVE_PRODUCT_DATA = {
  id: 'demo-product-1',
  name: 'Apple',
  storage_temp_min: 0.0,
  storage_temp_max: 2.0,
  storage_humidity_min: 90.0,
  storage_humidity_max: 95.0,
  shelf_life_days: 180
};

// Facilities & Rooms
export const DEMO_FACILITIES = [
  { 
    id: 'demo-facility-1', 
    name: 'Nashik_Storage_A Facility',
    facility_name: 'Nashik_Storage_A Facility'
  }
];

export const DEMO_ROOMS = [
  { 
    roomId: 'demo-room-1',
    id: 'demo-room-1',
    room_name: 'Storage Room A', 
    facilityId: 'demo-facility-1',
    facility_id: 'demo-facility-1',
    facilityName: 'Nashik_Storage_A Facility',
    facility_name: 'Nashik_Storage_A Facility'
  }
];

// ============ OWNER DEMO DATA ============

// Owner Sensor Data (Monitoring Page)
export const DEMO_OWNER_SENSORS = [
  { id: 1, icon: 'droplets', name: 'AmbientHumidity', reading: '69%', status: 'Active', maintenance: 'Not Required', sensor_type: 'AmbientHumidity', display_name: 'AmbientHumidity', last_reading_value: 69, last_reading_unit: '%' },
  { id: 2, icon: 'thermometer', name: 'AmbientTemperature', reading: '31°C', status: 'Active', maintenance: 'Not Required', sensor_type: 'AmbientTemperature', display_name: 'AmbientTemperature', last_reading_value: 31, last_reading_unit: '°C' },
  { id: 3, icon: 'battery', name: 'Battery', reading: '100%', status: 'Active', maintenance: 'Not Required', sensor_type: 'Battery', display_name: 'Battery', last_reading_value: 100, last_reading_unit: '%', battery_percentage: 100 },
  { id: 4, icon: 'door-open', name: 'Door', reading: 'Closed', status: 'Active', maintenance: 'Not Required', sensor_type: 'Door', display_name: 'Door', last_reading_value: null, last_reading_unit: 'Closed' },
  { id: 5, icon: 'wind', name: 'Ethylene', reading: '2.4 ppm', status: 'Active', maintenance: 'Not Required', sensor_type: 'Ethylene', display_name: 'Ethylene', last_reading_value: 2.4, last_reading_unit: 'ppm' },
  { id: 6, icon: 'zap', name: 'GridPower', reading: '0 W', status: 'Active', maintenance: 'Not Required', sensor_type: 'GridPower', display_name: 'GridPower', last_reading_value: 0, last_reading_unit: 'W' },
  { id: 7, icon: 'droplets', name: 'Humidity', reading: '92.3%', status: 'Active', maintenance: 'Not Required', sensor_type: 'Humidity', display_name: 'Humidity', last_reading_value: 92.3, last_reading_unit: '%' },
  { id: 8, icon: 'wind', name: 'Oxygen', reading: '20.8%', status: 'Active', maintenance: 'Not Required', sensor_type: 'Oxygen', display_name: 'Oxygen', last_reading_value: 20.8, last_reading_unit: '%' },
  { id: 9, icon: 'sun', name: 'Solar', reading: '2.1 kWh', status: 'Active', maintenance: 'Not Required', sensor_type: 'Solar', display_name: 'Solar', last_reading_value: 2.1, last_reading_unit: 'kWh' },
  { id: 10, icon: 'thermometer', name: 'Temperature', reading: '1.12°C', status: 'Active', maintenance: 'Not Required', sensor_type: 'Temperature', display_name: 'Temperature', last_reading_value: 1.12, last_reading_unit: '°C' }
];

// Owner Energy Data
export const DEMO_OWNER_ENERGY = {
  total_consumed: 756,
  from_grid: 32.19,
  from_solar: 723.81,
  cost_saved: 21714, // ₹30/kWh × 723.81 kWh ≈ ₹21,714
  per_facility: [
    { facility: 'Nashik_Storage_A Facility', consumed: 756 }
  ]
};

// Owner Inventory (Total across all facilities)
export const DEMO_OWNER_INVENTORY_OVERVIEW = {
  total_capacity_kg: 10000,
  occupied_kg: 225, // 11 crates × 25kg
  available_kg: 9775,
  total_crates: 11,
  occupied_percentage: 2.25,
  available_percentage: 97.75
};

// Owner Financial Data
export const DEMO_OWNER_FINANCE = {
  active_farmers: 1,
  crates_stored: 11,
  total_revenue: 787500, // ₹7,875 in Lakhs format (0.07875 L)
  total_expenses: 20000, // ₹200 in Lakhs format (0.002 L) - only 15 days
  net_profit: 767500, // Revenue - Expenses
  breakdown: {
    hvac_water_check: 5000, // ₹50
    inverter_replaced: 15000 // ₹150
  },
  six_month_trend: [
    { month: 'April', revenue: 0, expenses: 0, profit: 0 },
    { month: 'May', revenue: 0, expenses: 0, profit: 0 },
    { month: 'June', revenue: 0, expenses: 0, profit: 0 },
    { month: 'July', revenue: 0, expenses: 0, profit: 0 },
    { month: 'August', revenue: 0, expenses: 0, profit: 0 },
    { month: 'September', revenue: 78750, expenses: 20000, profit: 58750 } // ₹0.7875L revenue, ₹0.002L expenses, ₹0.58750L profit
  ],
  weekly_revenue: [
    { week: 'Week 1', revenue: 0 },
    { week: 'Week 2', revenue: 0 },
    { week: 'Week 3', revenue: 0 },
    { week: 'Week 4', revenue: 78750 }
  ],
  farmer_activity: [
    { day: 'Wed', removed: 0, added: 0 },
    { day: 'Thu', removed: 0, added: 0 },
    { day: 'Fri', removed: 0, added: 0 },
    { day: 'Sat', removed: 0, added: 0 },
    { day: 'Sun', removed: 0, added: 0 },
    { day: 'Mon', removed: 0, added: 0 },
    { day: 'Tue', removed: 7, added: 8 } // 7 crates removed (sold), 8 crates added (new batch)
  ],
  energy_consumption: [
    { date: '08/09', solar: 0, grid: 0 },
    { date: '09/09', solar: 0, grid: 0 },
    { date: '10/09', solar: 0, grid: 0 },
    { date: '11/09', solar: 0, grid: 0 },
    { date: '12/09', solar: 0, grid: 0 },
    { date: '13/09', solar: 0, grid: 0 },
    { date: '14/09', solar: 0, grid: 0 },
    { date: '15/09', solar: 723.81, grid: 32.19 }
  ]
};

// Owner System Alerts
export const DEMO_OWNER_ALERTS = [
  {
    id: 'owner-alert-1',
    created_at: new Date('2026-09-01').toISOString(),
    title: 'New farmer requested access',
    message: 'Farmer Roy has requested access to Nashik_Storage_A',
    type: 'farmer_request',
    is_acknowledged: true,
    severity: 'info'
  },
  {
    id: 'owner-alert-2',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    title: 'HVAC maintenance completed',
    message: 'Scheduled HVAC maintenance and water check performed',
    type: 'maintenance',
    is_acknowledged: true,
    severity: 'info'
  },
  {
    id: 'owner-alert-3',
    created_at: new Date().toISOString(),
    title: 'Temperature spiked alert',
    message: 'Internal temperature exceeded threshold for 24 minutes in Nashik_Storage_A',
    type: 'temperature',
    is_acknowledged: true,
    severity: 'warning'
  }
];

// ============ HELPER FUNCTIONS ============

// Circular rotation index
let demoValueIndex = 0;

export const getDemoCurrentValues = () => {
  const current = DEMO_TEMP_HUMIDITY_VALUES[demoValueIndex];
  demoValueIndex = (demoValueIndex + 1) % DEMO_TEMP_HUMIDITY_VALUES.length;
  return current;
};

export const resetDemoIndex = () => {
  demoValueIndex = 0;
};

export const generateDemoTemperatureHistory = () => {
  return DEMO_TEMP_HUMIDITY_VALUES.map((val, idx) => ({
    time: `T${idx + 1}`,
    temperature: val.temp,
    humidity: val.hum,
    value: val.temp,
    recorded_at: new Date(Date.now() - (15 - idx) * 60000).toISOString()
  }));
};

// Generate demo batches for display
export const generateDemoBatches = () => {
  return DEMO_INVENTORY.map(inv => ({
    id: inv.id,
    batch_code: inv.batch_code,
    farmer_id: 'demo-farmer-1',
    product_id: inv.product_id,
    initial_quantity_kg: inv.initial_quantity_kg,
    remaining_quantity_kg: inv.remaining_quantity_kg,
    harvest_date: inv.harvest_date,
    products: {
      id: inv.product_id,
      name: inv.product_name,
      storage_temp_min: DEMO_ACTIVE_PRODUCT_DATA.storage_temp_min,
      storage_temp_max: DEMO_ACTIVE_PRODUCT_DATA.storage_temp_max,
      storage_humidity_min: DEMO_ACTIVE_PRODUCT_DATA.storage_humidity_min,
      storage_humidity_max: DEMO_ACTIVE_PRODUCT_DATA.storage_humidity_max,
      shelf_life_days: DEMO_ACTIVE_PRODUCT_DATA.shelf_life_days
    }
  }));
};
