/**
 * Product Configuration
 * Defines optimal temperature thresholds for different products
 * Updated for ColdSense AI Farmer Module Refactor
 */

export interface ProductConfig {
  id: string;
  name: string;
  category: string;
  minTemp: number; // in Celsius
  maxTemp: number; // in Celsius
  optimalTemp: number; // in Celsius
  warningThreshold: number; // in Celsius (warning zone starts here)
  criticalThreshold: number; // in Celsius (critical zone starts here)
  minHumidity: number; // in percentage
  maxHumidity: number; // in percentage
  shelfLifeDays: number; // in days
  sellingPrice: number; // in INR
  icon: string;
}

export const PRODUCTS: ProductConfig[] = [
  {
    id: 'apple',
    name: 'Apple',
    category: 'Fruits',
    minTemp: -1.1,
    maxTemp: 3,
    optimalTemp: 1,
    warningThreshold: 2,
    criticalThreshold: 3,
    minHumidity: 90,
    maxHumidity: 95,
    shelfLifeDays: 120, // 3-5 months average
    sellingPrice: 85,
    icon: '🍎',
  },
  {
    id: 'mango',
    name: 'Mango',
    category: 'Fruits',
    minTemp: 10,
    maxTemp: 14,
    optimalTemp: 12,
    warningThreshold: 13,
    criticalThreshold: 14,
    minHumidity: 85,
    maxHumidity: 95,
    shelfLifeDays: 21, // 2-3 weeks average
    sellingPrice: 150,
    icon: '🥭',
  },
  {
    id: 'banana',
    name: 'Banana',
    category: 'Fruits',
    minTemp: 13,
    maxTemp: 14,
    optimalTemp: 13.5,
    warningThreshold: 14,
    criticalThreshold: 14,
    minHumidity: 90,
    maxHumidity: 95,
    shelfLifeDays: 14, // 1-2 weeks average
    sellingPrice: 40,
    icon: '🍌',
  },
  {
    id: 'tomato',
    name: 'Tomato',
    category: 'Vegetables',
    minTemp: 12,
    maxTemp: 15,
    optimalTemp: 13.5,
    warningThreshold: 14.5,
    criticalThreshold: 15,
    minHumidity: 85,
    maxHumidity: 95,
    shelfLifeDays: 21, // 2-3 weeks average
    sellingPrice: 30,
    icon: '🍅',
  },
  {
    id: 'potato',
    name: 'Potato',
    category: 'Vegetables',
    minTemp: 7,
    maxTemp: 10,
    optimalTemp: 8.5,
    warningThreshold: 9.5,
    criticalThreshold: 10,
    minHumidity: 90,
    maxHumidity: 95,
    shelfLifeDays: 180, // 4-6 months average
    sellingPrice: 20,
    icon: '🥔',
  },
  {
    id: 'onion',
    name: 'Onion',
    category: 'Vegetables',
    minTemp: 0,
    maxTemp: 4,
    optimalTemp: 2,
    warningThreshold: 3,
    criticalThreshold: 4,
    minHumidity: 65,
    maxHumidity: 75,
    shelfLifeDays: 120, // 3-5 months average
    sellingPrice: 25,
    icon: '🧅',
  },
  {
    id: 'dragon-fruit',
    name: 'Dragon Fruit',
    category: 'Exotic Fruits',
    minTemp: 6,
    maxTemp: 10,
    optimalTemp: 8,
    warningThreshold: 9,
    criticalThreshold: 10,
    minHumidity: 80,
    maxHumidity: 95,
    shelfLifeDays: 18, // 2-3 weeks average
    sellingPrice: 120,
    icon: '🔴', // Dragon fruit icon (red/pink fruit)
  },
  {
    id: 'avocado',
    name: 'Avocado',
    category: 'Exotic Fruits',
    minTemp: 7,
    maxTemp: 13,
    optimalTemp: 10,
    warningThreshold: 12,
    criticalThreshold: 13,
    minHumidity: 85,
    maxHumidity: 95,
    shelfLifeDays: 21, // 2-4 weeks average
    sellingPrice: 180,
    icon: '🥑',
  },
];

/**
 * Get products by site
 * Hamirpur (Exotic Fruits): Dragon Fruit, Avocado
 * Bajaura (Fruits): Apple, Mango, Banana
 */
export function getProductsBySite(siteName: string): ProductConfig[] {
  if (siteName === 'Hamirpur Site' || siteName === 'Hamirpur') {
    return PRODUCTS.filter(p => p.category === 'Exotic Fruits');
  } else if (siteName === 'Bajaura Site' || siteName === 'Bajaura') {
    return PRODUCTS.filter(p => p.category === 'Fruits');
  }
  return PRODUCTS;
}

/**
 * Get temperature status based on current temperature and product threshold
 */
export function getTemperatureStatus(
  currentTemp: number,
  productConfig: ProductConfig
): {
  status: 'optimal' | 'warning' | 'critical';
  color: string;
  message: string;
} {
  if (currentTemp >= productConfig.criticalThreshold || currentTemp <= productConfig.minTemp) {
    return {
      status: 'critical',
      color: 'red',
      message: 'Critical',
    };
  }
  if (currentTemp >= productConfig.warningThreshold || currentTemp <= productConfig.minTemp + 1) {
    return {
      status: 'warning',
      color: 'orange',
      message: 'Warning',
    };
  }
  return {
    status: 'optimal',
    color: 'green',
    message: 'Optimal',
  };
}

/**
 * Get product config by ID
 */
export function getProductConfig(productId: string): ProductConfig {
  return PRODUCTS.find((p) => p.id === productId) || PRODUCTS[0];
}

/**
 * Get default product (first in list)
 */
export function getDefaultProduct(): ProductConfig {
  return PRODUCTS[0];
}

/**
 * Get product by name
 */
export function getProductByName(productName: string): ProductConfig | undefined {
  return PRODUCTS.find((p) => p.name === productName);
}

/**
 * Get products for a specific farmer based on their selections
 * This is the single source of truth for farmer-specific product filtering
 */
export function getFarmerProducts(farmerSelectedProductNames: string[]): ProductConfig[] {
  if (!farmerSelectedProductNames || farmerSelectedProductNames.length === 0) {
    return [];
  }
  return farmerSelectedProductNames
    .map(productName => getProductByName(productName))
    .filter((product): product is ProductConfig => product !== undefined);
}

/**
 * Get default product for a specific farmer
 * Returns the first product from the farmer's selected products
 */
export function getFarmerDefaultProduct(farmerSelectedProductNames: string[]): ProductConfig {
  const farmerProducts = getFarmerProducts(farmerSelectedProductNames);
  return farmerProducts.length > 0 ? farmerProducts[0] : PRODUCTS[0];
}
