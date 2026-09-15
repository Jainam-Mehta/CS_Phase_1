/**
 * Temperature & Humidity Circular Values ONLY
 * 
 * These 15 values rotate every minute in a circular pattern.
 * All other data loads from Supabase database.
 */

// Temperature and humidity circular values (15 values that rotate every 60 seconds)
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

// Circular rotation index
let demoValueIndex = 0;

// Get current temperature/humidity value in circular fashion
export const getDemoCurrentValues = () => {
  const current = DEMO_TEMP_HUMIDITY_VALUES[demoValueIndex];
  demoValueIndex = (demoValueIndex + 1) % DEMO_TEMP_HUMIDITY_VALUES.length;
  return current;
};

// Reset index
export const resetDemoIndex = () => {
  demoValueIndex = 0;
};

// Generate temperature history from circular values
export const generateDemoTemperatureHistory = () => {
  return DEMO_TEMP_HUMIDITY_VALUES.map((val, idx) => ({
    time: `T${idx + 1}`,
    temperature: val.temp,
    humidity: val.hum,
    recorded_at: new Date(Date.now() - (15 - idx) * 60000).toISOString()
  }));
};
