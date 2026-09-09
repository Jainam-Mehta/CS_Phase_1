import React, { useEffect, useState } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appearance } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Apply theme IMMEDIATELY on mount (before React hydration)
  useEffect(() => {
    // Get theme from localStorage directly (faster than waiting for Zustand)
    // Default to 'light' theme when no preference is stored
    const getInitialTheme = () => {
      try {
        const stored = localStorage.getItem('coldsense-settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.state?.appearance || 'light';
        }
      } catch {
        return 'light';
      }
      return 'light';
    };

    const initialTheme = getInitialTheme();
    const root = document.documentElement;
    
    if (initialTheme === 'dark') {
      root.classList.add('dark');
    } else if (initialTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // system - default to light instead of following system preference
      root.classList.remove('dark');
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const applyTheme = (theme: 'light' | 'dark') => {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    const getSystemTheme = (): 'light' | 'dark' => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    };

    // Apply theme when appearance changes
    if (appearance === 'system') {
      applyTheme(getSystemTheme());
    } else {
      applyTheme(appearance);
    }

    // Listen for system theme changes when in system mode
    if (appearance === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [appearance, mounted]);

  return <>{children}</>;
};

export default ThemeProvider;
