import { useEffect } from 'react';
import { useMarketStore } from '../stores/useMarketStore';

/**
 * Hook to fetch and access market prices with automatic caching
 * 
 * @param products - Array of product names to fetch prices for
 * @returns Object with currentPrices, loading, error, and getPrice helper
 * 
 * @example
 * const { getPrice, loading } = useMarketPrices(['Mango', 'Apple']);
 * const mangoPrice = getPrice('Mango'); // Returns price or fallback value
 */
export const useMarketPrices = (products: string[]) => {
  const { currentPrices, loading, error, fetchCurrentPrices, isStale } = useMarketStore();

  useEffect(() => {
    if (products.length > 0 && isStale()) {
      fetchCurrentPrices(products);
    }
  }, [products.join(',')]); // Only refetch if product list changes

  /**
   * Get price for a product with fallback
   * @param productName - Name of the product
   * @param fallback - Fallback price if not found (default: 45)
   */
  const getPrice = (productName: string, fallback: number = 45): number => {
    const price = currentPrices[productName];
    return price?.price_per_kg ?? fallback;
  };

  /**
   * Get full price object for a product
   */
  const getPriceData = (productName: string) => {
    return currentPrices[productName] || null;
  };

  /**
   * Get price with trend info (for backwards compatibility with old MARKET_TRENDS_DB)
   * Returns: { current: number, predicted: number }
   * Note: Predicted prices are not available yet, so current is returned for both
   */
  const getTrend = (productName: string) => {
    const current = getPrice(productName);
    return {
      current,
      predicted: current, // Until predictions are implemented
    };
  };

  return {
    currentPrices,
    loading,
    error,
    getPrice,
    getPriceData,
    getTrend,
  };
};
