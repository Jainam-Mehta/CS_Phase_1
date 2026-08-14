import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdminSensor {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'door' | 'co2' | 'o2' | 'ammonia' | 'ethylene' | 'outdoor_temperature' | 'pressure' | 'solar' | 'electricity';
  units: number;
  status: 'Online' | 'Offline' | 'Faulty';
  lastReading?: number;
  lastUpdated?: string;
}

export interface AdminColdStorage {
  id: string;
  name: string;
  type: 'cold_room' | 'dairy_cold_storage';
  capacity: number;
  location: string;
  status: 'operational' | 'maintenance' | 'offline';
  healthScore: number;
  temperature: number;
  humidity: number;
  powerSource: 'solar' | 'electricity';
  sensors: AdminSensor[];
  productsStored: number;
  createdAt: string;
}

interface AdminStorageState {
  storages: AdminColdStorage[];
  addStorage: (storage: Omit<AdminColdStorage, 'id' | 'createdAt'>) => void;
  updateStorage: (id: string, updates: Partial<AdminColdStorage>) => void;
  deleteStorage: (id: string) => void;
  addSensor: (storageId: string, sensor: Omit<AdminSensor, 'id'>) => void;
  updateSensor: (storageId: string, sensorId: string, updates: Partial<AdminSensor>) => void;
  deleteSensor: (storageId: string, sensorId: string) => void;
}

export const useAdminStorageStore = create<AdminStorageState>()(
  persist(
    (set) => ({
      storages: [],
      
      addStorage: (storage) =>
        set((state) => ({
          storages: [
            ...state.storages,
            {
              ...storage,
              id: `cs-${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateStorage: (id, updates) =>
        set((state) => ({
          storages: state.storages.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      deleteStorage: (id) =>
        set((state) => ({
          storages: state.storages.filter((s) => s.id !== id),
        })),

      addSensor: (storageId, sensor) =>
        set((state) => ({
          storages: state.storages.map((s) =>
            s.id === storageId
              ? {
                  ...s,
                  sensors: [
                    ...s.sensors,
                    { ...sensor, id: `s-${Date.now()}` },
                  ],
                }
              : s
          ),
        })),

      updateSensor: (storageId, sensorId, updates) =>
        set((state) => ({
          storages: state.storages.map((s) =>
            s.id === storageId
              ? {
                  ...s,
                  sensors: s.sensors.map((sensor) =>
                    sensor.id === sensorId ? { ...sensor, ...updates } : sensor
                  ),
                }
              : s
          ),
        })),

      deleteSensor: (storageId, sensorId) =>
        set((state) => ({
          storages: state.storages.map((s) =>
            s.id === storageId
              ? {
                  ...s,
                  sensors: s.sensors.filter((sensor) => sensor.id !== sensorId),
                }
              : s
          ),
        })),
    }),
    {
      name: 'admin-storage-storage',
    }
  )
);
