'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'dtech-admin-theme'

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

function getServerTheme(): Theme {
  return 'dark'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Persisted theme — read from localStorage via useSyncExternalStore so
  // we never call setState synchronously inside an effect (React 19 rule).
  const persistedTheme = useSyncExternalStore(
    subscribeToStorage,
    readStoredTheme,
    getServerTheme
  )

  // Local override — set when user toggles. Falls back to persisted value.
  const [override, setOverride] = useState<Theme | null>(null)

  const theme = override ?? persistedTheme

  useEffect(() => {
    document.documentElement.setAttribute('data-admin-theme', theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    setOverride(next)
  }, [])

  const toggle = useCallback(() => {
    setOverride((current) => {
      const effective = current ?? readStoredTheme()
      const next: Theme = effective === 'dark' ? 'light' : 'dark'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next)
      }
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
