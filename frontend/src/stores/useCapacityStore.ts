import { create } from 'zustand';

interface CapacityData {
  total: number;
  used: number;
  percentage?: number;
}

interface CapacityStore {
  capacity: CapacityData;
  setCapacity: (capacity: CapacityData) => void;
}

export const useCapacityStore = create<CapacityStore>((set) => ({
  capacity: { total: 0, used: 0, percentage: 0 },
  setCapacity: (capacity: CapacityData) => set({ capacity }),
}));

