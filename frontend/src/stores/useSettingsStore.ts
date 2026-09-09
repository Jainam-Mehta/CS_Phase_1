import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // Profile
  name: string;
  email: string;
  mobile: string;
  
  // Notifications
  doorAlerts: boolean;
  marketUpdates: boolean;
  weeklyReports: boolean;
  aiRecommendations: boolean;
  
  // Appearance
  appearance: 'light' | 'dark' | 'system';
  
  // Language
  language: 'english' | 'hindi';
  
  // Actions
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setMobile: (mobile: string) => void;
  setDoorAlerts: (enabled: boolean) => void;
  setMarketUpdates: (enabled: boolean) => void;
  setWeeklyReports: (enabled: boolean) => void;
  setAiRecommendations: (enabled: boolean) => void;
  setAppearance: (appearance: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'english' | 'hindi') => void;
  resetSettings: () => void;
}

const defaultSettings = {
  name: 'Ram',
  email: 'ram@example.com',
  mobile: '+91 98765 43210',
  doorAlerts: true,
  marketUpdates: true,
  weeklyReports: true,
  aiRecommendations: true,
  appearance: 'light' as const,
  language: 'english' as const,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      
      setName: (name) => set({ name }),
      setEmail: (email) => set({ email }),
      setMobile: (mobile) => set({ mobile }),
      setDoorAlerts: (doorAlerts) => set({ doorAlerts }),
      setMarketUpdates: (marketUpdates) => set({ marketUpdates }),
      setWeeklyReports: (weeklyReports) => set({ weeklyReports }),
      setAiRecommendations: (aiRecommendations) => set({ aiRecommendations }),
      setAppearance: (appearance) => {
        set({ appearance });
        localStorage.setItem('theme', appearance);
        if (appearance === 'dark' || (appearance === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
      },
      setLanguage: (language) => set({ language }),
      
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'coldsense-settings',
    }
  )
);
