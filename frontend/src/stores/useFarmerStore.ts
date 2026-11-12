import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage } from 'zustand/middleware';

interface FarmerState {
  activeRoomId: string | null;
  activeProductId: string | null;
  
  // Market prices indexed by product name
  marketPrices: Record<string, {price: number; market: string}>;
  
  setActiveRoomId: (id: string | null) => void;
  setActiveProductId: (id: string | null) => void;
  setMarketPrices: (prices: Record<string, {price: number; market: string}>) => void;
}

export const useFarmerStore = create<FarmerState>()(
  persist(
    (set) => ({
      activeRoomId: null,
      activeProductId: null,
      marketPrices: {},
      
      setActiveRoomId: (id) => set({ activeRoomId: id }),
      setActiveProductId: (id) => set({ activeProductId: id }),
      setMarketPrices: (prices) => set({ marketPrices: prices }),
    }),
    {
      name: 'farmer-storage', // localStorage key
    }
  )
);
