import { create } from 'zustand';

interface NotificationPreferencesState {
  marketUpdates: boolean;
  doorAlerts: boolean;
  reports: boolean;
  aiRecommendations: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  
  setMarketUpdates: (enabled: boolean) => void;
  setDoorAlerts: (enabled: boolean) => void;
  setReports: (enabled: boolean) => void;
  setAiRecommendations: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setPushNotifications: (enabled: boolean) => void;
  resetPreferences: () => void;
}

const defaultPreferences = {
  marketUpdates: true,
  doorAlerts: true,
  reports: true,
  aiRecommendations: true,
  emailNotifications: true,
  pushNotifications: false,
};

export const useNotificationPreferencesStore = create<NotificationPreferencesState>((set) => ({
  ...defaultPreferences,
  
  setMarketUpdates: (marketUpdates) => set({ marketUpdates }),
  setDoorAlerts: (doorAlerts) => set({ doorAlerts }),
  setReports: (reports) => set({ reports }),
  setAiRecommendations: (aiRecommendations) => set({ aiRecommendations }),
  setEmailNotifications: (emailNotifications) => set({ emailNotifications }),
  setPushNotifications: (pushNotifications) => set({ pushNotifications }),
  
  resetPreferences: () => set(defaultPreferences),
}));
