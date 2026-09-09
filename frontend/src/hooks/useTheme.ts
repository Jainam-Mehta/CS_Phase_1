import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

/**
 * Applies the active theme class to <html> whenever the persisted
 * appearance setting changes. Single source of truth: useSettingsStore.
 */
export const useTheme = () => {
  const { appearance } = useSettingsStore();

  useEffect(() => {
    const root = window.document.documentElement;

    if (appearance === 'dark') {
      root.classList.add('dark');
    } else if (appearance === 'light') {
      root.classList.remove('dark');
    } else {
      // 'system'
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [appearance]);

  return { theme: appearance };
};
