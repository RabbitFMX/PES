import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { LeaderboardPage } from './LeaderboardPage'
import type { LeaderboardData, RoundOption } from '../../lib/types'

const getLeaderboard = vi.hoisted(() => vi.fn())
const getRoundOptions = vi.hoisted(() => vi.fn())
vi.mock('../../lib/api', () => ({ getLeaderboard, getRoundOptions }))

const rounds: RoundOption[] = [
  { id: 'r2', name: 'Round 2', status: 'open', startDate: '2026-07-01', endDate: '2026-12-31' },
  { id: 'r1', name: 'Round 1', status: 'closed', startDate: '2026-01-01', endDate: '2026-06-30' },
]

function data(over: Partial<LeaderboardData> = {}): LeaderboardData {
  return {
    roundId: 'r2',
    roundName: 'Round 2',
    isOpenRound: true,
    packA: [
      {
        memberId: 'me',
        displayName: 'Bára',
        avatarUrl: null,
        rank: 1,
        roundTotal: 1284,
        goalMetThisWeek: true,
        isCurrentUser: true,
        pointsByActivity: [
          { activityId: 'run', nameCs: 'běh', nameEn: 'Running', points: 900 },
          { activityId: null, nameCs: '', nameEn: '', points: 384 },
        ],
      },
    ],
    packB: [],
    ...over,
  }
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>,
  )
}

describe('LeaderboardPage — round filter + breakdown', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  beforeEach(() => {
    vi.clearAllMocks()
    getRoundOptions.mockResolvedValue(rounds)
    getLeaderboard.mockResolvedValue(data())
  })

  it('shows a round selector built from the rounds list', async () => {
    renderPage()
    expect(await screen.findByLabelText('Round')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Round 2/ })).toBeInTheDocument()
  })

  it('expands a row to show the per-activity breakdown', async () => {
    renderPage()
    const toggle = await screen.findByRole('button', { name: 'Points by activity' })
    await userEvent.click(toggle)
    expect(await screen.findByText('Running')).toBeInTheDocument()
    expect(screen.getByText('Quick add')).toBeInTheDocument()
  })

  it('hides the goal column for a past (closed) round', async () => {
    getLeaderboard.mockResolvedValue(data({ isOpenRound: false }))
    renderPage()
    // Row renders, but no goal badge for a past round.
    expect(await screen.findByText('Bára')).toBeInTheDocument()
    expect(screen.queryByText('Goal met')).not.toBeInTheDocument()
    expect(screen.queryByText('Goal not met')).not.toBeInTheDocument()
  })
})
