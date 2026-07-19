import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { LogActivityContext } from '../context/logActivity'
import { ToastContext, type Toast } from '../context/toast'
import { MemberOverview as Overview } from './MemberOverview'
import type { MemberOverview as OverviewData } from '../lib/types'

const getMemberOverview = vi.hoisted(() => vi.fn())
const deleteLogEntry = vi.hoisted(() => vi.fn())
vi.mock('../lib/api', () => ({ getMemberOverview, deleteLogEntry }))

function makeOverview(over: Partial<OverviewData> = {}): OverviewData {
  return {
    member: { id: 'me', displayName: 'Já', avatarUrl: null, division: 'A', isHistorical: false },
    weekly: { weeklyPoints: 30, weeklyGoal: 100, streakWeeks: 0 },
    currentWeekActivities: [
      {
        id: 'entry-1',
        activityId: 'run',
        activityName: 'běh',
        quantity: 8,
        unit: 'km',
        elevationM: 0,
        withStroller: false,
        points: 30,
        date: '2026-07-08',
      },
    ],
    records: {
      lifetimePoints: 30,
      roundsPlayed: 1,
      bestWeek: 30,
      longestStreakWeeks: 0,
      weeksAtGoal: 0,
      weeksBelowGoal: 1,
      weeksLogged: 1,
      avgWeeklyPoints: 30,
      favouriteActivity: 'běh',
      totalKm: 8,
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
    ...over,
  }
}

const toastValue = { showToast: vi.fn(), dismiss: vi.fn(), toasts: [] as Toast[] }

function renderOverview(isSelf: boolean) {
  return render(
    <ToastContext.Provider value={toastValue}>
      <LogActivityContext.Provider value={{ open: vi.fn() }}>
        <Overview memberId="me" isSelf={isSelf} />
      </LogActivityContext.Provider>
    </ToastContext.Provider>,
  )
}

describe('MemberOverview — edit/delete own activities', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('cs')
  })
  beforeEach(() => {
    vi.clearAllMocks()
    getMemberOverview.mockResolvedValue(makeOverview())
    deleteLogEntry.mockResolvedValue({ weeklyPoints: 0 })
  })

  it('shows edit/delete controls for your own current-week entries', async () => {
    renderOverview(true)
    expect(await screen.findByRole('button', { name: 'Smazat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upravit' })).toBeInTheDocument()
  })

  it('hides edit/delete when viewing another member', async () => {
    renderOverview(false)
    // Wait for the list to render (unique heading), then assert no controls.
    expect(await screen.findByRole('heading', { name: 'Tento týden' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Smazat' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Upravit' })).not.toBeInTheDocument()
  })

  it('deletes an entry after confirmation and refetches', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    getMemberOverview
      .mockResolvedValueOnce(makeOverview())
      .mockResolvedValueOnce(makeOverview({ currentWeekActivities: [] }))

    renderOverview(true)
    await userEvent.click(await screen.findByRole('button', { name: 'Smazat' }))

    expect(deleteLogEntry).toHaveBeenCalledWith('entry-1')
    await waitFor(() => expect(getMemberOverview).toHaveBeenCalledTimes(2))
  })

  it('does not delete when confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderOverview(true)
    await userEvent.click(await screen.findByRole('button', { name: 'Smazat' }))
    expect(deleteLogEntry).not.toHaveBeenCalled()
  })
})
