import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import i18n from './i18n'
import { ThemeProvider } from './context/ThemeProvider'
import { AuthProvider } from './context/AuthProvider'
import { ToastProvider } from './context/ToastProvider'

// Supabase Auth: no stored session; sign-in succeeds.
vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: async () => ({ data: { session: { access_token: 't' } }, error: null }),
      signOut: async () => ({ error: null }),
    },
  },
}))

// Data layer: canned responses so the flow renders without a live backend.
vi.mock('./lib/api', () => ({
  getMe: async () => ({
    id: 'me',
    displayName: 'Bára Nováková',
    email: 'bara@pes.dev',
    avatarUrl: null,
    role: 'member',
    division: 'A',
    coefficient: 1.25,
    languagePref: 'cs',
    themePref: 'light',
  }),
  getMemberOverview: async () => ({
    member: {
      id: 'me',
      displayName: 'Bára Nováková',
      avatarUrl: null,
      division: 'A',
      isHistorical: false,
    },
    weekly: { weeklyPoints: 64, weeklyGoal: 100, streakWeeks: 6 },
    currentWeekActivities: [],
    records: {
      lifetimePoints: 1284,
      roundsPlayed: 3,
      bestWeek: 120,
      longestStreakWeeks: 6,
      weeksAtGoal: 4,
      weeksBelowGoal: 2,
      weeksLogged: 6,
      avgWeeklyPoints: 92,
      favouriteActivity: 'běh',
      totalKm: 0,
      totalElevation: 0,
    },
    bestWeekDetail: null,
    pointsByActivity: [],
    topActivities: [],
    roundHistory: [],
    pointsByDayOfWeek: [],
    distanceByActivity: [],
    elevationByActivity: [],
    cumulative: [],
  }),
  getLeaderboard: async () => ({
    roundId: 'r1',
    roundName: 'Round 1',
    isOpenRound: true,
    packA: [],
    packB: [],
  }),
  getRoundOptions: async () => [],
  getChallenge: async () => ({
    id: null,
    title: '',
    description: '',
    deadline: '',
    isSetterTurn: false,
    hasSubmitted: false,
    submissions: [],
  }),
  getPastChallenges: async () => [],
  getActivities: async () => [],
}))

function renderApp(initial = '/login') {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initial]}>
            <App />
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>,
  )
}

describe('login → app navigation', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })

  it('signs in and lands on the dashboard, then navigates to the leaderboard', async () => {
    const user = userEvent.setup()
    renderApp('/login')

    await user.type(await screen.findByLabelText('Email'), 'bara@pes.dev')
    await user.type(screen.getByLabelText('Password'), 'secret')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    // Login applies the member's saved language preference (Czech). Assert the
    // language-independent progress ring value to confirm the dashboard loaded.
    const ring = await screen.findByRole('progressbar', {}, { timeout: 3000 })
    expect(ring).toHaveAttribute('aria-valuetext', '64 / 100')

    // Navigate to the leaderboard (TopBar + BottomTabBar both render the link).
    await user.click(screen.getAllByRole('link', { name: 'Žebříček' })[0])
    expect(
      await screen.findByRole('heading', { name: 'Žebříček' }, { timeout: 3000 }),
    ).toBeInTheDocument()
  })
})
