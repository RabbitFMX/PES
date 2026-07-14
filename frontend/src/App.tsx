import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import i18n from './i18n'
import { RequireAuth } from './components/RequireAuth'
import { RequireAdmin } from './components/RequireAdmin'
import { AppShell } from './components/layout/AppShell'
import { Skeleton } from './components/ui/Skeleton'
import { LoginPage } from './pages/login/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage'
import { ChallengesPage } from './pages/challenges/ChallengesPage'
import { AdminPage } from './pages/admin/AdminPage'
import { ProfilePage } from './pages/profile/ProfilePage'

// Code-split the Stats page — it pulls in Recharts, which we don't want in the
// initial bundle.
const StatsPage = lazy(() =>
  import('./pages/stats/StatsPage').then((m) => ({ default: m.StatsPage })),
)

function App() {
  // Keep <html lang> in sync with the active language (a11y: screen-reader pronunciation).
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = lng.startsWith('en') ? 'en' : 'cs'
    }
    apply(i18n.language)
    i18n.on('languageChanged', apply)
    return () => i18n.off('languageChanged', apply)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route
            path="/stats"
            element={
              <Suspense fallback={<Skeleton className="h-64" />}>
                <StatsPage />
              </Suspense>
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
