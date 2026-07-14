import { createContext, useContext } from 'react'
import type { ThemePref } from '../lib/types'

export interface ThemeContextValue {
  theme: ThemePref
  setTheme: (theme: ThemePref) => void
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

export const THEME_STORAGE_KEY = 'pes-theme'
