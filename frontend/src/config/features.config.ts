/**
 * Feature Flags Configuration
 * 
 * This file controls which features are visible in the UI.
 * All code remains intact - features are just hidden from users.
 * 
 * To enable a feature in the future: Set flag to true
 * To disable a feature: Set flag to false
 * 
 * NO CODE DELETION NEEDED - Just toggle these flags!
 */

export const FEATURE_FLAGS = {
  // ============ FARMER FEATURES ============
  
  /**
   * Price Calculator for Farmers
   * Status: HIDDEN (ML models not ready)
   * Location: /farmer/price-calculator
   * To Enable: Set to true when ML prediction models are deployed
   */
  FARMER_PRICE_CALCULATOR: false,
  
  /**
   * Market Intelligence & Predictions
   * Status: PARTIALLY ENABLED (show current prices, hide predictions)
   * Location: /farmer/market-intelligence
   * Shows: Current daily prices from live API
   * Hidden: ML-based price predictions
   */
  FARMER_MARKET_INTELLIGENCE: true, // Show for daily price display
  
  /**
   * Live Market Prices (Current Day Only)
   * Status: READY FOR ACTIVATION
   * Location: Market price displays throughout app
   * To Enable: Set to true when live market API is integrated
   */
  LIVE_MARKET_PRICES: false, // Will be true when API is provided
  
  // ============ ENERGY FEATURES ============
  
  /**
   * Inverter API Integration
   * Status: PENDING (API will be provided next week)
   * Features: Solar energy, grid energy, battery status
   * To Enable: Set to true when inverter API is provided
   */
  INVERTER_API: false,
  
  /**
   * Energy Predictions (ML-based)
   * Status: HIDDEN (not required immediately)
   */
  ENERGY_PREDICTIONS: false,
  
  // ============ AI/ML FEATURES ============
  
  /**
   * AI Recommendations
   * Status: KEEP CODE, HIDE UI (may be used later)
   */
  AI_RECOMMENDATIONS: true,
  
  /**
   * Predictive Analytics (within Market Intelligence)
   * Status: HIDDEN (ML models not priority)
   * When false: Show current prices only, hide predictions
   */
  MARKET_PRICE_PREDICTIONS: false,
  
  // ============ SIMULATOR MODE ============
  
  /**
   * Use Simulated Data (vs Real Sensors)
   * Status: TRUE until real sensors are live
   * When true: Uses simulator-generated data
   * When false: Uses real MQTT sensor data
   */
  USE_SIMULATED_DATA: true,
  
  /**
   * Show Simulator Controls (for testing)
   * Status: TRUE for development
   */
  SHOW_SIMULATOR_CONTROLS: true,
  
} as const;

// Type helper for TypeScript autocomplete
export type FeatureFlag = keyof typeof FEATURE_FLAGS;

/**
 * Helper function to check if a feature is enabled
 * Usage: if (isFeatureEnabled('FARMER_PRICE_CALCULATOR')) { ... }
 */
export const isFeatureEnabled = (feature: FeatureFlag): boolean => {
  return FEATURE_FLAGS[feature];
};

/**
 * Helper to get feature status message for admins
 */
export const getFeatureStatus = (feature: FeatureFlag): string => {
  return FEATURE_FLAGS[feature] ? 'Enabled' : 'Disabled';
};
