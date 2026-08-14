import { create } from 'zustand';

interface FarmerState {
  activeRoomId: string | null;
  activeProductId: string | null;
  
  setActiveRoomId: (id: string | null) => void;
  setActiveProductId: (id: string | null) => void;
}

export const useFarmerStore = create<FarmerState>((set) => ({
  activeRoomId: null,
  activeProductId: null,
  
  setActiveRoomId: (id) => set({ activeRoomId: id }),
  setActiveProductId: (id) => set({ activeProductId: id }),
}));
