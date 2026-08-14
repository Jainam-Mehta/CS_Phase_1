import { create } from 'zustand';

interface SiteStore {
  selectedFacilityId: string | null;
  setSelectedFacilityId: (id: string | null) => void;
}

export const useSiteStore = create<SiteStore>((set) => ({
  selectedFacilityId: null,
  setSelectedFacilityId: (id) => set({ selectedFacilityId: id }),
}));
