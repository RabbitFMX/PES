import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import i18n from '../i18n'
import { getMe } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { CurrentUser } from '../lib/types'
import { useTheme } from './theme'
import { AuthContext } from './auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(false)
  // Gate rendering until we know whether a stored session exists, so a
  // returning user doesn't flash the login screen before the resume completes.
  const [bootstrapping, setBootstrapping] = useState(true)
  const { setTheme } = useTheme()

  const applyPrefs = useCallback(
    (u: CurrentUser) => {
      // Apply the member's saved preferences on sign-in / resume.
      void i18n.changeLanguage(u.languagePref)
      setTheme(u.themePref)
    },
    [setTheme],
  )

  // Resume an existing Supabase session on load and hydrate the user.
  useEffect(() => {
    let active = true
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!session) return
        try {
          const u = await getMe()
          if (active) {
            setUser(u)
            applyPrefs(u)
          }
        } catch {
          // Stale/invalid session — fall through to logged-out.
        }
      })
      .finally(() => {
        if (active) setBootstrapping(false)
      })
    return () => {
      active = false
    }
  }, [applyPrefs])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const u = await getMe()
        setUser(u)
        applyPrefs(u)
      } finally {
        setLoading(false)
      }
    },
    [applyPrefs],
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const updateUser = useCallback(
    (patch: Partial<CurrentUser>) => setUser((u) => (u ? { ...u, ...patch } : u)),
    [],
  )

  const value = useMemo(
    () => ({ user, loading, login, logout, updateUser }),
    [user, loading, login, logout, updateUser],
  )

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <span className="animate-pulse text-3xl" role="status" aria-label="…">
          🐾
        </span>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
