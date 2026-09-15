/**
 * DEMO DATA - Farmer Dashboard Hardcoded Values
 * 
 * This file contains all hardcoded demo data for the farmer dashboard.
 * To remove demo data in production: 
 * 1. Delete this entire file
 * 2. Remove all imports of this file
 * 3. Remove all DEMO_ENABLED checks from FarmerDashboard.tsx
 * 
 * ALL demo data is controlled by the DEMO_ENABLED flag below.
 * Set to false to disable all demo features.
 */

export const DEMO_ENABLED = true; // Set to false to disable all demo data

// Demo temperature and humidity values (15 circular values)
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

// Demo door stats for all farmers
export const DEMO_DOOR_STATS = {
  status: 'Closed',
  count: 1, // Opened 1 time today
  duration: 0,
  lastOpenTime: 'Today'
};

// Demo alerts for all farmers
export const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    created_at: new Date().toISOString(),
    title: '7 kg apples delivered to Apple Studios',
    message: 'Order fulfillment completed successfully',
    type: 'order',
    is_acknowledged: true
  },
  {
    id: 'demo-alert-2',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    title: 'Temperature increased out of range',
    message: 'Temperature exceeded max range (6°C for apples) for 24 minutes',
    type: 'temperature',
    is_acknowledged: true
  }
];

// Demo inventory for all farmers
export const DEMO_INVENTORY = [
  {
    id: 'demo-inv-1',
    batch_code: 'BATCH-1789466259570-205BSI',
    product_name: 'Apple',
    quantity_kg: 250, // 10 crates × 25kg
    stored_date: '2026-09-03',
    remaining_quantity_kg: 75 // 3 crates remaining after 7-crate order
  },
  {
    id: 'demo-inv-2',
    batch_code: 'BATCH-1789466295723-2XGOBE',
    product_name: 'Apple',
    quantity_kg: 200, // 8 crates × 25kg
    stored_date: new Date().toISOString().split('T')[0], // Today
    remaining_quantity_kg: 200 // Full quantity, no orders yet
  }
];

// Demo orders for all farmers
export const DEMO_ORDERS = [
  {
    id: 'demo-order-1',
    batch_id: 'demo-inv-1',
    quantity_kg: 175, // 7 crates × 25kg
    selling_price: 45, // ₹45 per kg
    buyer: 'Apple Studios',
    sold_at: new Date().toISOString(),
    total_value: 7875 // 7 crates × 25kg × ₹45/kg
  }
];

// Demo revenue for all farmers
export const DEMO_REVENUE_EARNED = 7875; // From the order above

// Demo market intelligence for all farmers
export const DEMO_MARKET_PRICE = 45; // ₹45 per kg for apples

// Demo energy data (756 kWh)
export const DEMO_ENERGY_DATA = [
  { time: '09/08', value: 756 },
  { time: '09/09', value: 756 },
  { time: '09/10', value: 756 },
  { time: '09/11', value: 756 },
  { time: '09/12', value: 756 },
  { time: '09/13', value: 756 },
  { time: '09/14', value: 756 },
  { time: '09/15', value: 756 }
];

// Generate temperature history graph data from circular values
export const generateDemoTemperatureHistory = () => {
  return DEMO_TEMP_HUMIDITY_VALUES.map((val, idx) => ({
    time: `T${idx + 1}`,
    temperature: val.temp,
    humidity: val.hum,
    recorded_at: new Date(Date.now() - (15 - idx) * 60000).toISOString()
  }));
};

// Demo products
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

// Demo active product data
export const DEMO_ACTIVE_PRODUCT_DATA = {
  id: 'demo-product-1',
  name: 'Apple',
  storage_temp_min: 0.0,
  storage_temp_max: 2.0,
  storage_humidity_min: 90.0,
  storage_humidity_max: 95.0,
  shelf_life_days: 180
};

// Demo facilities and rooms
export const DEMO_FACILITIES = [
  { id: 'demo-facility-1', name: 'Nashik_Storage_A Facility' }
];

export const DEMO_ROOMS = [
  { 
    roomId: 'demo-room-1', 
    roomName: 'Storage Room A', 
    facilityId: 'demo-facility-1', 
    facilityName: 'Nashik_Storage_A Facility' 
  }
];

// Helper to get current demo temperature/humidity with circular rotation
let demoValueIndex = 0;
export const getDemoCurrentValues = () => {
  const current = DEMO_TEMP_HUMIDITY_VALUES[demoValueIndex];
  demoValueIndex = (demoValueIndex + 1) % DEMO_TEMP_HUMIDITY_VALUES.length;
  return current;
};

// Reset demo index (call this when component mounts)
export const resetDemoIndex = () => {
  demoValueIndex = 0;
};
