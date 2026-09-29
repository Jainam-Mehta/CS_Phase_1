import { create } from 'zustand';

interface SiteStore {
  selectedFacilityId: string | null;
  setSelectedFacilityId: (id: string | null) => void;
  selectedRoomId: string | null;
  setSelectedRoomId: (id: string | null) => void;
}

export const useSiteStore = create<SiteStore>((set) => ({
  selectedFacilityId: null,
  setSelectedFacilityId: (id) => set({ selectedFacilityId: id }),
  selectedRoomId: null,
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
}));
