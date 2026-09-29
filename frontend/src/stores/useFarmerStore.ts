import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PersistStorage } from 'zustand/middleware';

interface FarmerState {
  activeRoomId: string | null;
  activeProductId: string | null;
  
  setActiveRoomId: (id: string | null) => void;
  setActiveProductId: (id: string | null) => void;
}

export const useFarmerStore = create<FarmerState>()(
  persist(
    (set) => ({
      activeRoomId: null,
      activeProductId: null,
      
      setActiveRoomId: (id) => set({ activeRoomId: id }),
      setActiveProductId: (id) => set({ activeProductId: id }),
    }),
    {
      name: 'farmer-storage', // localStorage key
    }
  )
);
