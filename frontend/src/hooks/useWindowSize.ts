import { useState, useEffect } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

// Safe initializer — avoids SSR / test environment crashes
const getWindowSize = (): WindowSize => {
  if (typeof window === 'undefined') return { width: 1024, height: 768 };
  return { width: window.innerWidth, height: window.innerHeight };
};

export const useWindowSize = (): WindowSize => {
  const [windowSize, setWindowSize] = useState<WindowSize>(getWindowSize);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

/**
 * useMediaQuery — returns true when the CSS media query matches.
 * Avoids the infinite-loop bug where including `matches` in the
 * dependency array causes the effect to re-run every time it changes.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    // Sync immediately in case it changed between render and effect
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
    // Only re-run when the query string itself changes — NOT when matches changes
  }, [query]);

  return matches;
};
