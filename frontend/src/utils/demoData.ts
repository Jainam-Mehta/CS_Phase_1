/**
 * DEMO DATA - ALL HARDCODED FOR QUICK DEMO
 * 
 * This file contains all demo data. Once demo is done, revert to querying Supabase.
 * To revert: set DEMO_ENABLED = false and remove all hardcoded logic from pages.
 */

export const DEMO_ENABLED = true;

// ============ TEMPERATURE & HUMIDITY CIRCULAR VALUES ============
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

// ============ DOOR STATS ============
export const DEMO_DOOR_STATS = {
  status: 'Closed',
  count: 1,
  duration: 0,
  lastOpenTime: 'Today',
  openedTodayCount: 1
};

// ============ ALERTS ============
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

// ============ INVENTORY (BATCHES) ============
export const DEMO_INVENTORY = [
  {
    id: 'demo-batch-1',
    batch_code: 'BATCH-1789466259570-205BSI',
    product_name: 'Apple',
    product_id: 'demo-product-1',
    quantity_kg: 250,
    stored_date: '2026-09-03',
    remaining_quantity_kg: 75,
    initial_quantity_kg: 250,
    harvest_date: '2026-09-03',
    quality_grade: 'A',
    expiry_date: '2026-03-03'
  },
  {
    id: 'demo-batch-2',
    batch_code: 'BATCH-1789466295723-2XGOBE',
    product_name: 'Apple',
    product_id: 'demo-product-1',
    quantity_kg: 200,
    stored_date: '2026-09-15',
    remaining_quantity_kg: 200,
    initial_quantity_kg: 200,
    harvest_date: '2026-09-15',
    quality_grade: 'A',
    expiry_date: '2027-03-15'
  }
];

// ============ ORDERS ============
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

// ============ MARKET PRICES & REVENUE ============
export const DEMO_MARKET_PRICE = 45;
export const DEMO_REVENUE_EARNED = 7875;

// ============ ENERGY DATA ============
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

// ============ PRODUCTS ============
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

// ============ FACILITIES & ROOMS ============
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
