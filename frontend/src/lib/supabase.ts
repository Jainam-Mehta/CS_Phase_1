import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Test connection helper
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('states').select('count').limit(1);
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return false;
  }
};

// Database table types (based on Supabase schema)
export interface State {
  id: string;
  name: string;
  created_at: string;
}

export interface District {
  id: string;
  name: string;
  state_id: string;
  created_at: string;
}

export interface Locality {
  id: string;
  name: string;
  district_id: string;
  created_at: string;
}

export interface Profile {
  id: number;
  auth_user_id: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  state_id: string;
  district_id: string;
  locality_id?: string; // Now optional
  role_id: string; // Changed from number to string (UUID)
  owner_company_id?: string; // UUID - added for linking to owner_company
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string; // UUID
  name: string;
  category: string;
  min_temp: number;
  max_temp: number;
  optimal_temp: number;
  min_humidity: number;
  max_humidity: number;
  shelf_life_days: number;
  base_daily_kwh: number;
  base_capacity: number;
  selling_price: number;
  crate_charge: number;
  created_at: string;
  updated_at?: string;
}

// Live database schema interfaces
export interface OwnerCompany {
  id: string; // UUID
  company_name: string;
  contact_email: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  created_at: string;
}

export interface Site {
  id: string; // UUID
  site_code: string;
  site_name: string;
  district: string;
  city: string;
  state: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
  created_at: string;
  owner_company_id: string; // UUID
}

export interface Facility {
  id: string; // UUID
  owner_profile_id: number; // References profiles.id (SERIAL)
  facility_name: string;
  address: string;
  state_id: string;
  district_id: string;
  locality_id: string;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColdStorageRoom {
  id: string; // UUID
  room_code: string;
  facility_id: string; // UUID
  room_name: string;
  capacity_kg: number;
  current_utilization_kg: number;
  status: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  site_id: string; // UUID
}

export interface SensorDevice {
  id: string; // UUID
  room_id: string; // UUID
  sensor_name: string;
  sensor_type: string;
  serial_number: string;
  mqtt_topic: string;
  firmware_version: string;
  installation_date: string;
  last_calibration: string;
  status: string;
  last_seen: string;
  battery_percentage: number;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string; // UUID
  batch_code: string;
  farmer_id: number; // References profiles.id (SERIAL)
  product_id: string; // References products.id (UUID)
  harvest_date: string;
  expiry_date: string;
  initial_quantity_kg: number;
  remaining_quantity_kg: number;
  quality_grade: string;
  remarks: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string; // UUID
  room_id: string; // UUID
  farmer_id: number; // References profiles.id (SERIAL)
  product_name: string;
  quantity: number;
  storage_date: string;
  created_at: string;
  updated_at: string;
}

export interface CarbonCredit {
  id: string; // UUID
  owner_profile_id: number; // References profiles.id (SERIAL)
  activity: string;
  credits: number;
  co2_saved: number; // in tons
  activity_date: string;
  status: 'verified' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface StorageBatch {
  id: string; // UUID
  batch_code: string;
  farmer_id: number; // References profiles.id (SERIAL)
  room_id: string; // References cold_storage_rooms.id (UUID)
  products: string; // JSON array of product names
  quantity: number; // Total quantity in kg
  start_date: string;
  end_date: string;
  status: 'active' | 'completed' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface MaintenanceRecord {
  id: string; // UUID
  sensor_id: string; // References sensor_devices.id (UUID)
  issue: string;
  reported_date: string;
  completed_date: string | null;
  status: 'pending' | 'completed';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FarmerRoomAccess {
  id: string; // UUID
  farmer_id: number; // References profiles.id (SERIAL)
  room_id: string; // References cold_storage_rooms.id (UUID)
  status: 'Pending' | 'Approved' | 'Rejected' | 'Revoked';
  requested_at: string;
  reviewed_at: string | null;
  created_at: string;
}

export interface BatchRoomAllocation {
  id: string; // UUID
  batch_id: string; // References batches.id (UUID)
  room_id: string; // References cold_storage_rooms.id (UUID)
  quantity_kg: number;
  assigned_at: string;
  removed_at: string | null;
}

export interface PricingHistory {
  id: string; // UUID
  owner_profile_id: number; // References profiles.id (SERIAL)
  farmer_id: number; // References profiles.id (SERIAL)
  room_id: string; // References cold_storage_rooms.id (UUID)
  crates: number;
  price_per_crate: number;
  total_price: number;
  calculation_date: string;
  created_at: string;
}

// Note: The application now uses cold_storage_rooms as the canonical room table
// batch_room_allocations.room_id references cold_storage_rooms.id (not rooms.id)
// This Room interface is kept for backward compatibility but should not be used in new code
export interface Room {
  id: number;
  name: string;
  locality_id?: number;
  district_id?: number;
  created_at: string;
}

export interface FarmerProduct {
  id: number;
  farmer_id: number;
  product_id: number;
  created_at: string;
}

export interface RoomRequest {
  id: number;
  farmer_id: number;
  room_id: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}
