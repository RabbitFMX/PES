import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import i18n from '../i18n'
import { ConsentProvider } from '../context/ConsentProvider'
import { ConsentBanner } from './ConsentBanner'

// Spy on the integration seams and the audit-log call.
const initAnalytics = vi.hoisted(() => vi.fn())
const initMarketing = vi.hoisted(() => vi.fn())
vi.mock('../lib/analytics', () => ({ initAnalytics, teardownAnalytics: vi.fn() }))
vi.mock('../lib/marketing', () => ({ initMarketing, teardownMarketing: vi.fn() }))

const recordConsent = vi.hoisted(() => vi.fn(async () => ({ ok: true }) as const))
vi.mock('../lib/api', () => ({ recordConsent }))

function renderBanner() {
  return render(
    <ConsentProvider>
      <ConsentBanner />
    </ConsentProvider>,
  )
}

describe('ConsentBanner', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en')
  })
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('shows on first visit and loads NO non-essential script before a choice', () => {
    renderBanner()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(initAnalytics).not.toHaveBeenCalled()
    expect(initMarketing).not.toHaveBeenCalled()
  })

  it('has no pre-ticked non-essential boxes when customising', async () => {
    const user = userEvent.setup()
    renderBanner()
    await user.click(screen.getByRole('button', { name: 'Customise' }))

    const analytics = screen.getByRole('switch', { name: 'Analytics' })
    const marketing = screen.getByRole('switch', { name: 'Marketing' })
    expect(analytics).toHaveAttribute('aria-checked', 'false')
    expect(marketing).toHaveAttribute('aria-checked', 'false')
  })

  it('accepting all initialises both integrations, logs consent and dismisses', async () => {
    const user = userEvent.setup()
    renderBanner()

    await user.click(screen.getByRole('button', { name: 'Accept all' }))

    expect(initAnalytics).toHaveBeenCalledTimes(1)
    expect(initMarketing).toHaveBeenCalledTimes(1)
    expect(recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ consents: { analytics: true, marketing: true } }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('pes-consent')).toContain('"analytics":true')
  })

  it('rejecting non-essential initialises nothing and logs the refusal', async () => {
    const user = userEvent.setup()
    renderBanner()

    await user.click(screen.getByRole('button', { name: 'Reject non-essential' }))

    expect(initAnalytics).not.toHaveBeenCalled()
    expect(initMarketing).not.toHaveBeenCalled()
    expect(recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ consents: { analytics: false, marketing: false } }),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('customising to analytics-only initialises analytics but not marketing', async () => {
    const user = userEvent.setup()
    renderBanner()

    await user.click(screen.getByRole('button', { name: 'Customise' }))
    await user.click(screen.getByRole('switch', { name: 'Analytics' }))
    await user.click(screen.getByRole('button', { name: 'Save choices' }))

    expect(initAnalytics).toHaveBeenCalledTimes(1)
    expect(initMarketing).not.toHaveBeenCalled()
    expect(recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ consents: { analytics: true, marketing: false } }),
    )
  })
})
