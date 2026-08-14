/**
 * Role Service
 * Provides functions to lookup role UUIDs by name
 * instead of hardcoding numeric IDs
 */

import { supabase } from '../lib/supabase';

export interface Role {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

/**
 * Get role by name
 * @param roleName - The name of the role (e.g., 'Farmer', 'Owner', 'Stakeholder', 'Admin')
 * @returns The role object with UUID or null if not found
 */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', roleName)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching role '${roleName}':`, error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`Unexpected error fetching role '${roleName}':`, error);
    return null;
  }
}

/**
 * Get role ID by name (convenience function)
 * @param roleName - The name of the role
 * @returns The UUID string or null if not found
 */
export async function getRoleIdByName(roleName: string): Promise<string | null> {
  const role = await getRoleByName(roleName);
  return role?.id || null;
}

/**
 * Get all roles
 * @returns Array of all roles
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching roles:', error);
    return [];
  }
}

/**
 * Check if a role exists
 * @param roleName - The name of the role
 * @returns true if role exists, false otherwise
 */
export async function roleExists(roleName: string): Promise<boolean> {
  const role = await getRoleByName(roleName);
  return role !== null;
}

/**
 * Get the Farmer role UUID
 * @returns The Farmer role UUID or null
 */
export async function getFarmerRoleId(): Promise<string | null> {
  return getRoleIdByName('Farmer');
}

/**
 * Get the Owner role UUID
 * @returns The Owner role UUID or null
 */
export async function getOwnerRoleId(): Promise<string | null> {
  return getRoleIdByName('Owner');
}

/**
 * Get the Stakeholder role UUID
 * @returns The Stakeholder role UUID or null
 */
export async function getStakeholderRoleId(): Promise<string | null> {
  return getRoleIdByName('Stakeholder');
}

/**
 * Get the Admin role UUID
 * @returns The Admin role UUID or null
 */
export async function getAdminRoleId(): Promise<string | null> {
  return getRoleIdByName('Admin');
}

/**
 * Validate if a UUID is a valid role ID
 * @param roleId - The UUID to validate
 * @returns true if valid role ID, false otherwise
 */
export async function isValidRoleId(roleId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('id')
      .eq('id', roleId)
      .maybeSingle();

    if (error) {
      console.error('Error validating role ID:', error);
      return false;
    }

    return data !== null;
  } catch (error) {
    console.error('Unexpected error validating role ID:', error);
    return false;
  }
}
