import { createContext, useContext } from 'react'

export interface LogActivityContextValue {
  /** Opens the global Log-activity modal (owned by AppShell). */
  open: () => void
}

export const LogActivityContext = createContext<LogActivityContextValue | null>(null)

export function useLogActivity(): LogActivityContextValue {
  const ctx = useContext(LogActivityContext)
  if (!ctx) throw new Error('useLogActivity must be used within AppShell')
  return ctx
}
