/**
 * Centralized Unit Conversion Helpers
 * Standardized crate weight across ColdSense system.
 */

export const KG_PER_CRATE = 25;

/**
 * Convert quantity in crates to kilograms.
 */
export const convertCratesToKg = (crates: number): number => {
  return Math.round((crates || 0) * KG_PER_CRATE * 100) / 100;
};

/**
 * Convert quantity in kilograms to crates (rounded up).
 */
export const convertKgToCrates = (kg: number): number => {
  if (!kg || kg <= 0) return 0;
  return Math.ceil(kg / KG_PER_CRATE);
};
