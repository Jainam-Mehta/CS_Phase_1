/**
 * Profile Resolution Utilities
 * 
 * CRITICAL: All Owner data queries must resolve the profile first
 * 
 * Database relationship:
 * auth.users.id -> profiles.auth_user_id -> profiles.id -> facilities.owner_profile_id
 * 
 * NEVER use auth.user.id directly for facility queries
 * ALWAYS resolve profile.id first, then use profile.id for facility queries
 */

import { supabase } from './supabase';

/**
 * Resolve user profile from auth user ID
 * @param authUserId - The auth.users.id
 * @returns Profile record or null
 */
export async function resolveProfile(authUserId: string) {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, owner_company_id')
      .eq('auth_user_id', authUserId)
      .single();

    if (error) {
      console.error('Error resolving profile:', error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error('Exception resolving profile:', error);
    return null;
  }
}

/**
 * Get owner's facilities using profile ID
 * @param profileId - The profiles.id
 * @returns Facilities array
 */
export async function getOwnerFacilities(profileId: string) {
  try {
    const { data: facilities, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('owner_profile_id', profileId);

    if (error) {
      console.error('Error fetching owner facilities:', error);
      return [];
    }

    return facilities || [];
  } catch (error) {
    console.error('Exception fetching owner facilities:', error);
    return [];
  }
}

/**
 * Get owner's rooms using profile ID
 * @param profileId - The profiles.id
 * @returns Rooms array
 */
export async function getOwnerRooms(profileId: string) {
  try {
    // First get facilities
    const facilities = await getOwnerFacilities(profileId);
    if (facilities.length === 0) return [];

    const facilityIds = facilities.map(f => f.id);

    const { data: rooms, error } = await supabase
      .from('cold_storage_rooms')
      .select('*')
      .in('facility_id', facilityIds);

    if (error) {
      console.error('Error fetching owner rooms:', error);
      return [];
    }

    return rooms || [];
  } catch (error) {
    console.error('Exception fetching owner rooms:', error);
    return [];
  }
}

/**
 * Get owner's sensors using profile ID
 * @param profileId - The profiles.id
 * @returns Sensors array
 */
export async function getOwnerSensors(profileId: string) {
  try {
    // First get rooms
    const rooms = await getOwnerRooms(profileId);
    if (rooms.length === 0) return [];

    const roomIds = rooms.map(r => r.id);

    const { data: sensors, error } = await supabase
      .from('sensor_devices')
      .select('*')
      .in('room_id', roomIds);

    if (error) {
      console.error('Error fetching owner sensors:', error);
      return [];
    }

    return sensors || [];
  } catch (error) {
    console.error('Exception fetching owner sensors:', error);
    return [];
  }
}

/**
 * Complete owner data resolution in one call
 * @param authUserId - The auth.users.id
 * @returns Object with profile, facilities, rooms, sensors
 */
export async function resolveOwnerData(authUserId: string) {
  const profile = await resolveProfile(authUserId);
  
  if (!profile) {
    return {
      profile: null,
      facilities: [],
      rooms: [],
      sensors: [],
    };
  }

  const facilities = await getOwnerFacilities(profile.id);
  const rooms = await getOwnerRooms(profile.id);
  const sensors = await getOwnerSensors(profile.id);

  return {
    profile,
    facilities,
    rooms,
    sensors,
  };
}
