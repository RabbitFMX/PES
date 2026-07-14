import { useCallback, useMemo, useState, type ReactNode } from 'react'
import i18n from '../i18n'
import * as api from '../lib/mockApi'
import type { CurrentUser } from '../lib/types'
import { useTheme } from './theme'
import { AuthContext } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(false)
  const { setTheme } = useTheme()

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const u = await api.login(email, password)
        setUser(u)
        // Apply the member's saved preferences on sign-in.
        void i18n.changeLanguage(u.languagePref)
        setTheme(u.themePref)
      } finally {
        setLoading(false)
      }
    },
    [setTheme],
  )

  const logout = useCallback(() => setUser(null), [])

  const updateUser = useCallback(
    (patch: Partial<CurrentUser>) => setUser((u) => (u ? { ...u, ...patch } : u)),
    [],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser }),
    [user, loading, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
