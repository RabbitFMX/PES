import { Route, Routes } from 'react-router-dom'
import { NavBar } from './components/NavBar'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage'
import { StatsPage } from './pages/stats/StatsPage'
import { ChallengesPage } from './pages/challenges/ChallengesPage'
import { AdminPage } from './pages/admin/AdminPage'

function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  )
}

export default App
