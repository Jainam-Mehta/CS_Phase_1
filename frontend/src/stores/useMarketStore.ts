import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface MarketPrice {
  id: string;
  product_id: string;
  product_name: string;
  price_per_kg: number;
  recorded_at: string;
  state: string;
  city?: string;
  market_name?: string;
}

export interface PricePrediction {
  id: string;
  product_id: string;
  product_name?: string;
  predicted_price: number;
  prediction_date: string;
  confidence: number;
}

interface MarketState {
  // Current market prices indexed by product name (for quick lookup)
  currentPrices: Record<string, MarketPrice>;
  
  // Predicted prices indexed by product ID
  predictions: Record<string, PricePrediction[]>;
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  lastFetched: number | null; // Unix timestamp
  
  // Actions
  fetchCurrentPrices: (products: string[]) => Promise<void>;
  fetchPriceByProduct: (productId: string, state?: string) => Promise<void>;
  fetchPredictions: (productId: string) => Promise<void>;
  clearCache: () => void;
  isStale: () => boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      currentPrices: {},
      predictions: {},
      loading: false,
      error: null,
      lastFetched: null,

      isStale: () => {
        const { lastFetched } = get();
        if (!lastFetched) return true;
        return Date.now() - lastFetched > CACHE_DURATION;
      },

      clearCache: () => {
        set({
          currentPrices: {},
          predictions: {},
          lastFetched: null,
          error: null,
        });
      },

      fetchCurrentPrices: async (products: string[]) => {
        // Skip if not stale and we have all requested products
        const { currentPrices, isStale } = get();
        const hasAllProducts = products.every(p => currentPrices[p]);
        
        if (!isStale() && hasAllProducts && products.length > 0) {
          console.log('useMarketStore: Using cached prices');
          return;
        }

        set({ loading: true, error: null });

        try {
          // For now, we'll fetch all products since we don't have product IDs
          // In production, you'd want to map product names to IDs first
          // This is a simplified version that assumes the backend can handle product names
          
          // TODO: When product name → ID mapping is available:
          // 1. Query products table to get IDs
          // 2. Then fetch prices by ID
          
          // For now, log that we would fetch these products
          console.log('useMarketStore: Would fetch prices for:', products);
          
          // Since market_prices table uses product_id and we don't have that mapping yet,
          // we'll set an empty result and let components use fallback values
          // This will be properly implemented when products are in the database
          
          set({
            loading: false,
            lastFetched: Date.now(),
            error: 'Market price API integration pending - using fallback values',
          });

          // TODO: Remove this when product mapping is ready and uncomment below:
          /*
          const promises = products.map(async (productName) => {
            // First get product ID from name
            const productResp = await fetch(
              `${API_BASE_URL}/api/products?name=${encodeURIComponent(productName)}`
            );
            if (!productResp.ok) throw new Error(`Failed to fetch product: ${productName}`);
            const productData = await productResp.json();
            if (!productData || productData.length === 0) return null;
            
            const productId = productData[0].id;
            
            // Then fetch price
            const priceResp = await fetch(
              `${API_BASE_URL}/api/market/prices/product/${productId}`
            );
            if (!priceResp.ok) throw new Error(`Failed to fetch price for: ${productName}`);
            const priceData = await priceResp.json();
            
            // Get most recent price
            if (priceData && priceData.length > 0) {
              return { ...priceData[0], product_name: productName };
            }
            return null;
          });

          const results = await Promise.all(promises);
          const newPrices: Record<string, MarketPrice> = {};
          
          results.forEach((price) => {
            if (price) {
              newPrices[price.product_name] = price;
            }
          });

          set((state) => ({
            currentPrices: { ...state.currentPrices, ...newPrices },
            loading: false,
            error: null,
            lastFetched: Date.now(),
          }));
          */
        } catch (error: any) {
          console.error('useMarketStore: Error fetching prices:', error);
          set({
            loading: false,
            error: error.message || 'Failed to fetch market prices',
          });
        }
      },

      fetchPriceByProduct: async (productId: string, state?: string) => {
        set({ loading: true, error: null });

        try {
          const url = state
            ? `${API_BASE_URL}/api/market/prices/product/${productId}?state=${encodeURIComponent(state)}`
            : `${API_BASE_URL}/api/market/prices/product/${productId}`;

          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: MarketPrice[] = await response.json();
          
          // Store most recent price by product name
          if (data && data.length > 0) {
            const latestPrice = data[0]; // Already sorted by recorded_at desc from API
            
            set((state) => ({
              currentPrices: {
                ...state.currentPrices,
                [latestPrice.product_name]: latestPrice,
              },
              loading: false,
              error: null,
              lastFetched: Date.now(),
            }));
          } else {
            set({ loading: false, error: 'No price data available for this product' });
          }
        } catch (error: any) {
          console.error('useMarketStore: Error fetching price:', error);
          set({
            loading: false,
            error: error.message || 'Failed to fetch product price',
          });
        }
      },

      fetchPredictions: async (productId: string) => {
        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/market/predictions/product/${productId}`
          );
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data: PricePrediction[] = await response.json();
          
          set((state) => ({
            predictions: {
              ...state.predictions,
              [productId]: data,
            },
            loading: false,
            error: null,
          }));
        } catch (error: any) {
          console.error('useMarketStore: Error fetching predictions:', error);
          set({
            loading: false,
            error: error.message || 'Failed to fetch price predictions',
          });
        }
      },
    }),
    {
      name: 'coldsense-market-store',
      // Only persist prices and predictions, not loading/error states
      partialize: (state) => ({
        currentPrices: state.currentPrices,
        predictions: state.predictions,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
