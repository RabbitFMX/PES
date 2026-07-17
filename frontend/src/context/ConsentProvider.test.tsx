import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CONSENT_POLICY_VERSION } from '../lib/consent'
import { ConsentProvider } from './ConsentProvider'
import { useConsent } from './consent'

const teardownAnalytics = vi.hoisted(() => vi.fn())
const teardownMarketing = vi.hoisted(() => vi.fn())
const initAnalytics = vi.hoisted(() => vi.fn())
const initMarketing = vi.hoisted(() => vi.fn())
vi.mock('../lib/analytics', () => ({ initAnalytics, teardownAnalytics }))
vi.mock('../lib/marketing', () => ({ initMarketing, teardownMarketing }))

const recordConsent = vi.hoisted(() => vi.fn(async () => ({ ok: true }) as const))
vi.mock('../lib/api', () => ({ recordConsent }))

/** A tiny consumer mirroring what the Profile Privacy toggles do. */
function Harness() {
  const { consent, updateCategory } = useConsent()
  return (
    <div>
      <span data-testid="analytics">{String(consent.analytics)}</span>
      <button onClick={() => updateCategory('marketing', false)}>withdraw-marketing</button>
    </div>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('ConsentProvider', () => {
  it('applies a previously stored decision on mount (returning visitor)', () => {
    localStorage.setItem(
      'pes-consent',
      JSON.stringify({
        analytics: true,
        marketing: false,
        version: CONSENT_POLICY_VERSION,
        decidedAt: 'x',
      }),
    )
    render(
      <ConsentProvider>
        <Harness />
      </ConsentProvider>,
    )
    expect(screen.getByTestId('analytics')).toHaveTextContent('true')
    expect(initAnalytics).toHaveBeenCalledTimes(1) // analytics granted → loaded
    expect(teardownMarketing).toHaveBeenCalled() // marketing off → stays torn down
  })

  it('withdrawing consent tears the integration down and logs the withdrawal', async () => {
    localStorage.setItem(
      'pes-consent',
      JSON.stringify({
        analytics: true,
        marketing: true,
        version: CONSENT_POLICY_VERSION,
        decidedAt: 'x',
      }),
    )
    const user = userEvent.setup()
    render(
      <ConsentProvider>
        <Harness />
      </ConsentProvider>,
    )
    vi.clearAllMocks() // ignore the mount-time apply; focus on the withdrawal

    await user.click(screen.getByRole('button', { name: 'withdraw-marketing' }))

    expect(teardownMarketing).toHaveBeenCalledTimes(1)
    expect(initMarketing).not.toHaveBeenCalled()
    expect(recordConsent).toHaveBeenCalledWith(
      expect.objectContaining({ consents: { analytics: true, marketing: false } }),
    )
    expect(localStorage.getItem('pes-consent')).toContain('"marketing":false')
  })
})
