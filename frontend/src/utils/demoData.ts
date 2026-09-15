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
    title: '7 crates of apples delivered to Apple Studios',
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
  },
  {
    id: 'demo-alert-3',
    created_at: new Date('2026-09-03').toISOString(),
    title: 'Door was left opened for 14 minutes',
    message: 'Storage room door was open for 14 minutes on Sep 3',
    type: 'door',
    is_acknowledged: true,
    alert_type: 'door_alert',
    severity: 'info',
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
    quantity_kg: 75, // 3 crates × 25kg (after 7 sold from initial 10)
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

// Inventory Summary (for display)
export const DEMO_INVENTORY_SUMMARY = {
  total_crates: 11,
  batches: [
    { batch_code: 'BATCH-1789466259570-205BSI', crates: 3 },
    { batch_code: 'BATCH-1789466295723-2XGOBE', crates: 8 }
  ]
};

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
export const DEMO_MARKET_PRICE = 95;
export const DEMO_MARKET_NAME = 'Mandi';
export const DEMO_REVENUE_EARNED = 95 * 7 * 25; // ₹16,625 (95 rupees/kg × 7 crates × 25 kg/crate)

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

// ============ STAKEHOLDER DEMO DATA ============
export const DEMO_STAKEHOLDER_INVESTMENTS = [
  {
    facility_id: 'demo-facility-1',
    facility_name: 'Nashik_Storage_A Facility',
    stateName: 'Maharashtra',
    districtName: 'Nashik',
    cityName: 'Nashik',
    investment_amount_inr: 20000,
    roi_percentage_estimate: 5.0,
    carbon_credits: 241
  },
  {
    facility_id: 'demo-facility-2',
    facility_name: 'Kullu_Site_Room_A+B Facility',
    stateName: 'Himachal Pradesh',
    districtName: 'Kullu',
    cityName: 'Kullu',
    investment_amount_inr: 20000,
    roi_percentage_estimate: 5.0,
    carbon_credits: 241
  }
];

export const DEMO_ALL_FACILITIES = [
  { id: 'demo-facility-1', facility_name: 'Nashik_Storage_A Facility', stateName: 'Maharashtra', districtName: 'Nashik', cityName: 'Nashik', stateId: 'mh' },
  { id: 'demo-facility-2', facility_name: 'Kullu_Site_Room_A+B Facility', stateName: 'Himachal Pradesh', districtName: 'Kullu', cityName: 'Kullu', stateId: 'hp' },
  { id: 'demo-facility-3', facility_name: 'Pune_Cold_Storage', stateName: 'Maharashtra', districtName: 'Pune', cityName: 'Pune', stateId: 'mh' },
  { id: 'demo-facility-4', facility_name: 'Nagpur_Citrus_Hub', stateName: 'Maharashtra', districtName: 'Nagpur', cityName: 'Nagpur', stateId: 'mh' },
  { id: 'demo-facility-5', facility_name: 'Shimla_Apple_Zone', stateName: 'Himachal Pradesh', districtName: 'Shimla', cityName: 'Shimla', stateId: 'hp' },
  { id: 'demo-facility-6', facility_name: 'Ludhiana_Agro_Cold', stateName: 'Punjab', districtName: 'Ludhiana', cityName: 'Ludhiana', stateId: 'pb' },
  { id: 'demo-facility-7', facility_name: 'Amritsar_Storage', stateName: 'Punjab', districtName: 'Amritsar', cityName: 'Amritsar', stateId: 'pb' },
  { id: 'demo-facility-8', facility_name: 'Agra_Potato_Vault', stateName: 'Uttar Pradesh', districtName: 'Agra', cityName: 'Agra', stateId: 'up' },
  { id: 'demo-facility-9', facility_name: 'Varanasi_Cold_Chain', stateName: 'Uttar Pradesh', districtName: 'Varanasi', cityName: 'Varanasi', stateId: 'up' },
  { id: 'demo-facility-10', facility_name: 'Surat_Fresh_Vault', stateName: 'Gujarat', districtName: 'Surat', cityName: 'Surat', stateId: 'gj' },
  { id: 'demo-facility-11', facility_name: 'Rajkot_Agro_Hub', stateName: 'Gujarat', districtName: 'Rajkot', cityName: 'Rajkot', stateId: 'gj' },
  { id: 'demo-facility-12', facility_name: 'Indore_Spices_Cold', stateName: 'Madhya Pradesh', districtName: 'Indore', cityName: 'Indore', stateId: 'mp' },
  { id: 'demo-facility-13', facility_name: 'Bhopal_Central_Store', stateName: 'Madhya Pradesh', districtName: 'Bhopal', cityName: 'Bhopal', stateId: 'mp' }
];

export const DEMO_STAKEHOLDER_PORTFOLIO = {
  totalInvestment: 40000,
  totalFacilities: 13,
  investedFacilities: 2,
  totalCities: 2,
  avgRoi: 5.0,
  totalProfit: 42000,
  carbonCredits: 482,
  treesSavedLakhs: 0.24
};

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
  occupied_kg: 450, // 18 crates × 25kg
  available_kg: 9550,
  total_crates: 18,
  occupied_percentage: 4.5,
  available_percentage: 95.5
};

// Owner Financial Data
export const DEMO_OWNER_FINANCE = {
  active_farmers: 1,
  crates_stored: 18,
  total_revenue: 20021.6, // ₹20,021.6
  total_expenses: 2000, // ₹2,000 (10x increase so visible in charts)
  net_profit: 18021.6, // ₹18,021.6 (Revenue - Expenses)
  breakdown: {
    hvac_water_check: 500, // ₹500 (25%)
    inverter_replaced: 1500 // ₹1,500 (75%)
  },
  six_month_trend: [
    { month: 'April', revenue: 0, expenses: 0, profit: 0 },
    { month: 'May', revenue: 0, expenses: 0, profit: 0 },
    { month: 'June', revenue: 0, expenses: 0, profit: 0 },
    { month: 'July', revenue: 0, expenses: 0, profit: 0 },
    { month: 'August', revenue: 0, expenses: 0, profit: 0 },
    { month: 'September', revenue: 20021.6, expenses: 2000, profit: 18021.6 }
  ],
  weekly_revenue: [
    { week: 'Week 1', revenue: 10012 },
    { week: 'Week 2', revenue: 10009.6 },
    { week: 'Week 3', revenue: 0 },
    { week: 'Week 4', revenue: 0 }
  ],
  farmer_activity: [
    { day: 'Wed', removed: 0, added: 0 },
    { day: 'Thu', removed: 0, added: 0 },
    { day: 'Fri', removed: 0, added: 0 },
    { day: 'Sat', removed: 0, added: 0 },
    { day: 'Sun', removed: 0, added: 0 },
    { day: 'Mon', removed: 0, added: 0 },
    { day: 'Tue', removed: 1, added: 1 } // 1 batch removed (sold), 1 batch added (new batch)
  ],
  energy_consumption: [
    { date: '09/09', solar: 47.47, grid: 2.13 }, // 49.6
    { date: '10/09', solar: 47.75, grid: 2.15 }, // 49.9
    { date: '11/09', solar: 48.81, grid: 2.19 }, // 51.0
    { date: '12/09', solar: 47.66, grid: 2.14 }, // 49.8
    { date: '13/09', solar: 48.23, grid: 2.17 }, // 50.4
    { date: '14/09', solar: 47.95, grid: 2.15 }, // 50.1
    { date: '15/09', solar: 48.04, grid: 2.16 }  // 50.2
  ]
};

// Owner System Alerts
export const DEMO_OWNER_ALERTS = [
  {
    id: 'owner-alert-1',
    created_at: new Date('2026-09-03').toISOString(),
    title: 'Door opened for 14 minutes',
    message: 'Storage room door was open for 14 minutes on Sep 3',
    type: 'door',
    is_acknowledged: true,
    severity: 'info'
  },
  {
    id: 'owner-alert-3',
    created_at: new Date('2026-09-08').toISOString(),
    title: 'Temperature increased out of range',
    message: 'Temperature exceeded max range (6°C for apples) for 24 minutes on Sep 8',
    type: 'temperature',
    is_acknowledged: true,
    severity: 'critical'
  },
  {
    id: 'owner-alert-2',
    created_at: new Date('2026-09-15').toISOString(),
    title: 'HVAC maintenance completed',
    message: 'Scheduled HVAC maintenance and water check performed successfully on Sep 15',
    type: 'maintenance',
    is_acknowledged: true,
    severity: 'info'
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
