import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from './lib/react-query'
import { router } from './routes'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import ThemeProvider from './components/theme/ThemeProvider'
import './styles/globals.css'

// Prevent theme flash by reading appearance from the persisted settings store.
// useSettingsStore persists to 'coldsense-settings'; the appearance field lives there.
// Fall back to reading the legacy 'theme' key so existing sessions aren't broken.
// Default to 'light' theme when no preference is stored.
const resolveInitialTheme = (): 'dark' | 'light' => {
  try {
    const settings = localStorage.getItem('coldsense-settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      const appearance: string = parsed?.state?.appearance ?? 'light';
      if (appearance === 'dark') return 'dark';
      if (appearance === 'light') return 'light';
      // 'system' — fall through to media query
    } else {
      // Legacy key written by old toggleTheme in OwnerLayout
      const legacy = localStorage.getItem('theme');
      if (legacy === 'dark') return 'dark';
      if (legacy === 'light') return 'light';
    }
  } catch {
    // ignore JSON parse errors
  }
  // Default to light theme instead of following system preference
  return 'light';
};

if (resolveInitialTheme() === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
