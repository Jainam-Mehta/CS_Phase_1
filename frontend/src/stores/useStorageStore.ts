import { create } from 'zustand';
import type { ColdStorage } from '../types';

interface StorageState {
  storages: ColdStorage[];
  selectedStorage: ColdStorage | null;
  setStorages: (storages: ColdStorage[]) => void;
  addStorage: (storage: ColdStorage) => void;
  updateStorage: (id: string, updates: Partial<ColdStorage>) => void;
  removeStorage: (id: string) => void;
  setSelectedStorage: (storage: ColdStorage | null) => void;
}

export const useStorageStore = create<StorageState>((set) => ({
  storages: [],
  selectedStorage: null,
  setStorages: (storages) => set({ storages }),
  addStorage: (storage) =>
    set((state) => ({
      storages: [...state.storages, storage],
    })),
  updateStorage: (id, updates) =>
    set((state) => ({
      storages: state.storages.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      selectedStorage:
        state.selectedStorage?.id === id
          ? { ...state.selectedStorage, ...updates }
          : state.selectedStorage,
    })),
  removeStorage: (id) =>
    set((state) => ({
      storages: state.storages.filter((s) => s.id !== id),
      selectedStorage:
        state.selectedStorage?.id === id ? null : state.selectedStorage,
    })),
  setSelectedStorage: (storage) => set({ selectedStorage: storage }),
}));
