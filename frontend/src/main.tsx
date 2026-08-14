import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryProvider } from './lib/react-query'
import { router } from './routes'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import ThemeProvider from './components/theme/ThemeProvider'
import './styles/globals.css'

// Prevent theme flash by immediately evaluating global storage values before DOM compilation
const savedTheme = localStorage.getItem('theme') || 'system';
if (savedTheme === 'dark' || (savedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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
