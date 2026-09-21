// ============================================================================
// DEMO DATA - Hardcoded for Client Presentation
// ============================================================================
// Active for these 3 emails only:
// - rupesh@coldsense.in (Owner)
// - roy@coldsense.in (Farmer)
// - aman@coldsense.in (Stakeholder)
// ============================================================================

export const DEMO_EMAILS = {
  owner: 'rupesh@coldsense.in',
  farmer: 'roy@coldsense.in',
  stakeholder: 'aman@coldsense.in',
};

export const isDemoUser = (email: string) => {
  return Object.values(DEMO_EMAILS).includes(email?.toLowerCase());
};

// ============================================================================
// OWNER DATA - rupesh@coldsense.in
// ============================================================================

export const OWNER_DEMO_DATA = {
  profile: {
    id: 'demo-owner-id',
    email: 'rupesh@coldsense.in',
    full_name: 'Suresh Kumar',
    role: 'owner',
    phone: '+91 98765 43210',
  },

  sites: [
    {
      id: 'site-kullu-a',
      facility_name: 'Kullu Storage A',
      address: '123 Mountain View, Kullu',
      state: 'Himachal Pradesh',
      district: 'Kullu',
      locality: 'Kullu Town',
      is_active: true,
      total_capacity_kg: 5000,
      current_utilization_kg: 1125, // 45 crates × 25kg
      utilization_percentage: 22.5,
      total_rooms: 1,
    },
    {
      id: 'site-hamirpur-ab',
      facility_name: 'Hamirpur Cold Store',
      address: '456 Valley Road, Hamirpur',
      state: 'Himachal Pradesh',
      district: 'Hamirpur',
      locality: 'Hamirpur City',
      is_active: true,
      total_capacity_kg: 8000,
      current_utilization_kg: 0,
      utilization_percentage: 0,
      total_rooms: 2,
    },
  ],

  rooms: [
    {
      id: 'room-kullu-a-1',
      site_id: 'site-kullu-a',
      room_code: 'RM-1001',
      room_name: 'Kullu Storage A',
      capacity_kg: 5000,
      current_utilization_kg: 1125,
      status: 'active',
      temperature: 5.6,
      humidity: 89.23,
    },
    {
      id: 'room-hamirpur-a',
      site_id: 'site-hamirpur-ab',
      room_code: 'RM-2001',
      room_name: 'Site A',
      capacity_kg: 4000,
      current_utilization_kg: 0,
      status: 'active',
      temperature: 4.2,
      humidity: 85.0,
    },
    {
      id: 'room-hamirpur-b',
      site_id: 'site-hamirpur-ab',
      room_code: 'RM-2002',
      room_name: 'Site B',
      capacity_kg: 4000,
      current_utilization_kg: 0,
      status: 'active',
      temperature: 4.5,
      humidity: 86.5,
    },
  ],

  sensors: [
    // Kullu Storage A - 13 sensors
    { id: 's1', room_id: 'room-kullu-a-1', sensor_type: 'temperature', sensor_name: 'Internal Temp 1', status: 'Online', last_reading: 5.6, unit: '°C' },
    { id: 's2', room_id: 'room-kullu-a-1', sensor_type: 'temperature', sensor_name: 'Internal Temp 2', status: 'Online', last_reading: 5.7, unit: '°C' },
    { id: 's3', room_id: 'room-kullu-a-1', sensor_type: 'humidity', sensor_name: 'Internal Humidity', status: 'Online', last_reading: 89.23, unit: '%' },
    { id: 's4', room_id: 'room-kullu-a-1', sensor_type: 'temperature', sensor_name: 'Ambient Temp', status: 'Online', last_reading: 22.3, unit: '°C' },
    { id: 's5', room_id: 'room-kullu-a-1', sensor_type: 'humidity', sensor_name: 'Ambient Humidity', status: 'Online', last_reading: 65.8, unit: '%' },
    { id: 's6', room_id: 'room-kullu-a-1', sensor_type: 'door', sensor_name: 'Door Sensor 1', status: 'Online', last_reading: 0, unit: 'Closed' },
    { id: 's7', room_id: 'room-kullu-a-1', sensor_type: 'door', sensor_name: 'Door Sensor 2', status: 'Online', last_reading: 0, unit: 'Closed' },
    { id: 's8', room_id: 'room-kullu-a-1', sensor_type: 'compressor', sensor_name: 'Compressor Monitor', status: 'Online', last_reading: 87.5, unit: '%' },
    { id: 's9', room_id: 'room-kullu-a-1', sensor_type: 'solar', sensor_name: 'Solar Power', status: 'Online', last_reading: 3.2, unit: 'kW' },
    { id: 's10', room_id: 'room-kullu-a-1', sensor_type: 'battery', sensor_name: 'Battery Monitor', status: 'Online', last_reading: 92, unit: '%' },
    { id: 's11', room_id: 'room-kullu-a-1', sensor_type: 'grid', sensor_name: 'Grid Power', status: 'Online', last_reading: 4.8, unit: 'kW' },
    { id: 's12', room_id: 'room-kullu-a-1', sensor_type: 'oxygen', sensor_name: 'Oxygen Sensor', status: 'Online', last_reading: 20.8, unit: '%' },
    { id: 's13', room_id: 'room-kullu-a-1', sensor_type: 'ammonia', sensor_name: 'Ammonia Sensor', status: 'Online', last_reading: 2.3, unit: 'ppm' },
  ],

  sensorReadings: [
    // 8 historical readings for Kullu Storage A
    { timestamp: '2024-09-21 14:00', temperature: 5.8, humidity: 89.5 },
    { timestamp: '2024-09-21 10:00', temperature: 5.5, humidity: 88.9 },
    { timestamp: '2024-09-20 18:00', temperature: 5.7, humidity: 89.8 },
    { timestamp: '2024-09-20 14:00', temperature: 5.4, humidity: 88.5 },
    { timestamp: '2024-09-19 18:00', temperature: 5.9, humidity: 90.1 },
    { timestamp: '2024-09-19 10:00', temperature: 5.6, humidity: 89.0 },
    { timestamp: '2024-09-18 18:00', temperature: 5.3, humidity: 88.7 },
    { timestamp: '2024-09-18 10:00', temperature: 5.7, humidity: 89.4 },
  ],

  inventory: [
    { id: 'inv1', room_id: 'room-kullu-a-1', farmer_name: 'Roy', product: 'Tomatoes', quantity_kg: 300, crates: 12, date: '2024-09-16', status: 'stored' },
    { id: 'inv2', room_id: 'room-kullu-a-1', farmer_name: 'Roy', product: 'Tomatoes', quantity_kg: 275, crates: 11, date: '2024-09-18', status: 'stored' },
    { id: 'inv3', room_id: 'room-kullu-a-1', farmer_name: 'Roy', product: 'Tomatoes', quantity_kg: 200, crates: 8, date: '2024-09-19', status: 'stored' },
    { id: 'inv4', room_id: 'room-kullu-a-1', farmer_name: 'Roy', product: 'Tomatoes', quantity_kg: 350, crates: 14, date: '2024-09-21', status: 'stored' },
    { id: 'inv5', room_id: 'room-kullu-a-1', farmer_name: 'Roy', product: 'Tomatoes', quantity_kg: 625, crates: 25, date: '2024-09-21', status: 'sold' },
  ],

  maintenance: [
    {
      id: 'm1',
      site_id: 'site-kullu-a',
      maintenance_type: 'HVAC Water Check',
      description: 'Routine HVAC system water check and filter replacement',
      scheduled_date: '2024-09-20',
      completed_date: '2024-09-20',
      status: 'completed',
      cost: 1500,
    },
  ],

  expenses: [
    { id: 'exp1', site_id: 'site-kullu-a', category: 'Maintenance', amount: 1500, description: 'HVAC Water Check', date: '2024-09-20' },
    { id: 'exp2', site_id: 'site-kullu-a', category: 'Electricity', amount: 3200, description: 'Monthly power bill', date: '2024-09-15' },
    { id: 'exp3', site_id: 'site-hamirpur-ab', category: 'Electricity', amount: 4100, description: 'Monthly power bill', date: '2024-09-15' },
  ],

  energy: [
    // 7 days × 2 sites
    { site_id: 'site-kullu-a', date: '2024-09-21', kwh: 52 },
    { site_id: 'site-kullu-a', date: '2024-09-20', kwh: 48 },
    { site_id: 'site-kullu-a', date: '2024-09-19', kwh: 51 },
    { site_id: 'site-kullu-a', date: '2024-09-18', kwh: 49 },
    { site_id: 'site-kullu-a', date: '2024-09-17', kwh: 50 },
    { site_id: 'site-kullu-a', date: '2024-09-16', kwh: 53 },
    { site_id: 'site-kullu-a', date: '2024-09-15', kwh: 47 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-21', kwh: 54 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-20', kwh: 51 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-19', kwh: 48 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-18', kwh: 52 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-17', kwh: 49 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-16', kwh: 50 },
    { site_id: 'site-hamirpur-ab', date: '2024-09-15', kwh: 53 },
  ],

  alerts: [
    { id: 'a1', site_id: 'site-kullu-a', severity: 'warning', message: 'Temperature slightly elevated', status: 'resolved', created_at: '2024-09-19 14:30' },
    { id: 'a2', site_id: 'site-kullu-a', severity: 'info', message: 'HVAC maintenance completed', status: 'resolved', created_at: '2024-09-20 16:00' },
    { id: 'a3', site_id: 'site-kullu-a', severity: 'info', message: 'Inventory dispatched - 25 crates', status: 'resolved', created_at: '2024-09-21 11:00' },
  ],

  activityLogs: [
    { timestamp: '2024-09-16 09:00', action: 'Farmer Roy requested storage access' },
    { timestamp: '2024-09-16 09:30', action: 'Approved storage request for Roy - Kullu Storage A' },
    { timestamp: '2024-09-16 10:00', action: 'Roy added 12 crates of Tomatoes' },
    { timestamp: '2024-09-18 14:00', action: 'Roy added 11 crates of Tomatoes' },
    { timestamp: '2024-09-19 11:00', action: 'Roy added 8 crates of Tomatoes' },
    { timestamp: '2024-09-20 16:00', action: 'HVAC maintenance completed - ₹1,500' },
    { timestamp: '2024-09-21 10:00', action: 'Roy added 14 crates of Tomatoes' },
    { timestamp: '2024-09-21 11:00', action: 'Roy dispatched 25 crates to Studios Market' },
    { timestamp: '2024-09-21 12:00', action: 'Payment received from Roy - Storage charges' },
  ],

  farmerPayments: [
    { farmer_name: 'Roy', date: '2024-09-16', crates: 12, days: 6, amount: 100.8, status: 'paid' },
    { farmer_name: 'Roy', date: '2024-09-18', crates: 11, days: 4, amount: 61.6, status: 'paid' },
    { farmer_name: 'Roy', date: '2024-09-19', crates: 8, days: 3, amount: 33.6, status: 'paid' },
    { farmer_name: 'Roy', date: '2024-09-21', crates: 14, days: 1, amount: 19.6, status: 'paid' },
    { farmer_name: 'Roy', date: '2024-09-21', crates: 25, days: 0, amount: 0, status: 'dispatched' },
  ],
};

// ============================================================================
// FARMER DATA - roy@coldsense.in
// ============================================================================

export const FARMER_DEMO_DATA = {
  profile: {
    id: 'demo-farmer-id',
    email: 'roy@coldsense.in',
    full_name: 'Roy Mehta',
    role: 'farmer',
    phone: '+91 98123 45678',
    state: 'Himachal Pradesh',
    district: 'Kullu',
  },

  approvedSites: [
    {
      id: 'site-kullu-a',
      facility_name: 'Kullu Storage A',
      owner_name: 'Suresh Kumar',
      room_id: 'room-kullu-a-1',
      room_name: 'Kullu Storage A',
      status: 'approved',
      approval_date: '2024-09-16',
    },
  ],

  inventory: [
    { id: 'inv1', product: 'Tomatoes', quantity_kg: 300, crates: 12, quality: 'A', date: '2024-09-16', status: 'stored', storage_days: 6 },
    { id: 'inv2', product: 'Tomatoes', quantity_kg: 275, crates: 11, quality: 'A', date: '2024-09-18', status: 'stored', storage_days: 4 },
    { id: 'inv3', product: 'Tomatoes', quantity_kg: 200, crates: 8, quality: 'A', date: '2024-09-19', status: 'stored', storage_days: 3 },
    { id: 'inv4', product: 'Tomatoes', quantity_kg: 350, crates: 14, quality: 'A', date: '2024-09-21', status: 'stored', storage_days: 1 },
  ],

  sales: [
    {
      id: 'sale1',
      product: 'Tomatoes',
      crates: 25,
      quantity_kg: 625,
      price_per_kg: 48,
      total_amount: 30000,
      buyer: 'Studios Market',
      sale_date: '2024-09-21',
      status: 'completed',
    },
  ],

  sensorReadings: [
    { timestamp: '2024-09-21 14:00', temperature: 5.8, humidity: 89.5 },
    { timestamp: '2024-09-21 10:00', temperature: 5.5, humidity: 88.9 },
    { timestamp: '2024-09-20 18:00', temperature: 5.7, humidity: 89.8 },
    { timestamp: '2024-09-20 14:00', temperature: 5.4, humidity: 88.5 },
    { timestamp: '2024-09-19 18:00', temperature: 5.9, humidity: 90.1 },
    { timestamp: '2024-09-19 10:00', temperature: 5.6, humidity: 89.0 },
    { timestamp: '2024-09-18 18:00', temperature: 5.3, humidity: 88.7 },
    { timestamp: '2024-09-18 10:00', temperature: 5.7, humidity: 89.4 },
  ],

  storageCharges: [
    { date: '2024-09-16', crates: 12, days: 6, rate: 1.4, amount: 100.8, status: 'paid' },
    { date: '2024-09-18', crates: 11, days: 4, rate: 1.4, amount: 61.6, status: 'paid' },
    { date: '2024-09-19', crates: 8, days: 3, rate: 1.4, amount: 33.6, status: 'paid' },
    { date: '2024-09-21', crates: 14, days: 1, rate: 1.4, amount: 19.6, status: 'paid' },
    { date: '2024-09-21', crates: 25, days: 0, rate: 1.4, amount: 0, status: 'dispatched' },
  ],

  financials: {
    total_revenue: 30000, // 25 crates × 25 kg × ₹48
    total_storage_cost: 216.2, // Sum of storage charges
    net_profit: 29783.8, // Revenue - Storage cost
  },

  activityLogs: [
    { timestamp: '2024-09-16 09:00', action: 'Requested storage at Kullu Storage A' },
    { timestamp: '2024-09-16 09:30', action: 'Storage request approved by Owner' },
    { timestamp: '2024-09-16 10:00', action: 'Added 12 crates of Tomatoes (300 kg)' },
    { timestamp: '2024-09-18 14:00', action: 'Added 11 crates of Tomatoes (275 kg)' },
    { timestamp: '2024-09-19 11:00', action: 'Added 8 crates of Tomatoes (200 kg)' },
    { timestamp: '2024-09-21 10:00', action: 'Added 14 crates of Tomatoes (350 kg)' },
    { timestamp: '2024-09-21 11:00', action: 'Dispatched 25 crates to Studios Market' },
    { timestamp: '2024-09-21 11:30', action: 'Sale completed - ₹30,000 received' },
    { timestamp: '2024-09-21 12:00', action: 'Paid storage charges - ₹216.20' },
  ],

  alerts: [
    { id: 'fa1', severity: 'info', message: 'Storage request approved', status: 'resolved', created_at: '2024-09-16 09:30' },
    { id: 'fa2', severity: 'warning', message: 'Temperature slightly elevated', status: 'resolved', created_at: '2024-09-19 14:30' },
    { id: 'fa3', severity: 'info', message: 'Sale dispatched successfully', status: 'resolved', created_at: '2024-09-21 11:00' },
  ],
};

// ============================================================================
// STAKEHOLDER DATA - aman@coldsense.in
// ============================================================================

export const STAKEHOLDER_DEMO_DATA = {
  profile: {
    id: 'demo-stakeholder-id',
    email: 'aman@coldsense.in',
    full_name: 'Aman Sharma',
    role: 'stakeholder',
    phone: '+91 99887 76655',
  },

  investments: [
    { id: 'i1', site_name: 'Kullu Storage A', owner: 'Suresh Kumar', state: 'Himachal Pradesh', district: 'Kullu', amount: 20000, roi: 5.3, monthly_return: 88.33, status: 'active', start_date: '2024-08-01' },
    { id: 'i2', site_name: 'Hamirpur Cold Store', owner: 'Suresh Kumar', state: 'Himachal Pradesh', district: 'Hamirpur', amount: 20000, roi: 5.3, monthly_return: 88.33, status: 'active', start_date: '2024-08-01' },
    { id: 'i3', site_name: 'Nashik Fresh Storage', owner: 'Vipul Patel', state: 'Maharashtra', district: 'Nashik', amount: 20000, roi: 5.3, monthly_return: 88.33, status: 'active', start_date: '2024-07-15' },
    { id: 'i4', site_name: 'Mumbai Cold Chain', owner: 'Ritvik Shah', state: 'Maharashtra', district: 'Mumbai', amount: 20000, roi: 5.3, monthly_return: 88.33, status: 'active', start_date: '2024-07-20' },
    { id: 'i5', site_name: 'Kullu Valley Storage', owner: 'Pratik Singh', state: 'Himachal Pradesh', district: 'Kullu', amount: 20000, roi: 5.3, monthly_return: 88.33, status: 'active', start_date: '2024-08-10' },
    { id: 'i6', site_name: 'Haryana Agri Cold Store', owner: 'Lohan Kumar', state: 'Haryana', district: 'Faridabad', amount: 20000, roi: 5.3, monthly_return: 88.33, status: 'active', start_date: '2024-08-05' },
  ],

  financials: {
    total_investment: 120000,
    total_roi_percentage: 5.3,
    monthly_return: 530, // ₹88.33 × 6
    total_return_received: 1060, // 2 months
  },

  payments: [
    // 2 months ROI per site = 12 rows
    { site_name: 'Kullu Storage A', month: 'August 2024', amount: 88.33, status: 'paid', date: '2024-09-05' },
    { site_name: 'Kullu Storage A', month: 'September 2024', amount: 88.33, status: 'paid', date: '2024-10-05' },
    { site_name: 'Hamirpur Cold Store', month: 'August 2024', amount: 88.33, status: 'paid', date: '2024-09-05' },
    { site_name: 'Hamirpur Cold Store', month: 'September 2024', amount: 88.33, status: 'paid', date: '2024-10-05' },
    { site_name: 'Nashik Fresh Storage', month: 'August 2024', amount: 88.33, status: 'paid', date: '2024-09-05' },
    { site_name: 'Nashik Fresh Storage', month: 'September 2024', amount: 88.33, status: 'paid', date: '2024-10-05' },
    { site_name: 'Mumbai Cold Chain', month: 'August 2024', amount: 88.33, status: 'paid', date: '2024-09-05' },
    { site_name: 'Mumbai Cold Chain', month: 'September 2024', amount: 88.33, status: 'paid', date: '2024-10-05' },
    { site_name: 'Kullu Valley Storage', month: 'August 2024', amount: 88.33, status: 'paid', date: '2024-09-05' },
    { site_name: 'Kullu Valley Storage', month: 'September 2024', amount: 88.33, status: 'paid', date: '2024-10-05' },
    { site_name: 'Haryana Agri Cold Store', month: 'August 2024', amount: 88.33, status: 'paid', date: '2024-09-05' },
    { site_name: 'Haryana Agri Cold Store', month: 'September 2024', amount: 88.33, status: 'paid', date: '2024-10-05' },
  ],

  activityLogs: [
    { timestamp: '2024-08-01', action: 'Invested ₹20,000 in Kullu Storage A' },
    { timestamp: '2024-08-01', action: 'Invested ₹20,000 in Hamirpur Cold Store' },
    { timestamp: '2024-07-15', action: 'Invested ₹20,000 in Nashik Fresh Storage' },
    { timestamp: '2024-07-20', action: 'Invested ₹20,000 in Mumbai Cold Chain' },
    { timestamp: '2024-08-10', action: 'Invested ₹20,000 in Kullu Valley Storage' },
    { timestamp: '2024-08-05', action: 'Invested ₹20,000 in Haryana Agri Cold Store' },
    { timestamp: '2024-09-05', action: 'Received ROI payment - ₹530' },
    { timestamp: '2024-10-05', action: 'Received ROI payment - ₹530' },
  ],
};
