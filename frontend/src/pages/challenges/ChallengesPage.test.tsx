import { render, screen } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../../i18n'
import { ToastContext, type Toast } from '../../context/toast'
import { ChallengesPage } from './ChallengesPage'
import type { ChallengeData } from '../../lib/types'

const getChallenge = vi.hoisted(() => vi.fn())
const getPastChallenges = vi.hoisted(() => vi.fn())
const submitChallenge = vi.hoisted(() => vi.fn())
const createChallenge = vi.hoisted(() => vi.fn())
vi.mock('../../lib/api', () => ({
  getChallenge,
  getPastChallenges,
  submitChallenge,
  createChallenge,
}))

function base(over: Partial<ChallengeData> = {}): ChallengeData {
  return {
    id: 'ch-1',
    title: 'Nejvíc kliků',
    description: 'Do neděle.',
    deadline: '',
    scoringMode: 'competitive',
    setterMemberId: 'm2',
    setterName: 'Ondra',
    isSetterTurn: false,
    hasSubmitted: false,
    submissions: [],
    ...over,
  }
}

const toastValue = { showToast: vi.fn(), dismiss: vi.fn(), toasts: [] as Toast[] }

function renderPage() {
  return render(
    <ToastContext.Provider value={toastValue}>
      <ChallengesPage />
    </ToastContext.Provider>,
  )
}

describe('ChallengesPage', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  beforeEach(() => {
    vi.clearAllMocks()
    getPastChallenges.mockResolvedValue([])
  })

  it('always shows who sets this week’s challenge', async () => {
    getChallenge.mockResolvedValue(base())
    renderPage()
    expect(await screen.findByText(/Ondra sets this week's challenge/)).toBeInTheDocument()
  })

  it('shows the submit form for a competitive challenge', async () => {
    getChallenge.mockResolvedValue(base({ scoringMode: 'competitive' }))
    renderPage()
    expect(await screen.findByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('hides the submit form and shows the completion hint for a completion challenge', async () => {
    getChallenge.mockResolvedValue(base({ scoringMode: 'completion' }))
    renderPage()
    expect(await screen.findByText(/awarded by the setter/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
  })
})
