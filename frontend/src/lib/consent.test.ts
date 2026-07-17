import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONSENT_POLICY_HASH,
  CONSENT_POLICY_TEXT,
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  fnv1a,
  loadConsent,
  NO_CONSENT,
  saveConsent,
} from './consent'

beforeEach(() => localStorage.clear())

describe('consent policy identity', () => {
  it('defaults to no non-essential consent (no pre-ticked boxes)', () => {
    expect(NO_CONSENT).toEqual({ analytics: false, marketing: false })
  })

  it('fnv1a is stable and hex; the exported hash matches the policy text', () => {
    expect(fnv1a('abc')).toBe(fnv1a('abc'))
    expect(fnv1a('abc')).toMatch(/^[0-9a-f]{8}$/)
    expect(fnv1a('abc')).not.toBe(fnv1a('abd'))
    expect(CONSENT_POLICY_HASH).toBe(fnv1a(CONSENT_POLICY_TEXT))
  })
})

describe('loadConsent / saveConsent', () => {
  it('returns null when nothing is stored', () => {
    expect(loadConsent()).toBeNull()
  })

  it('round-trips a decision and stamps the current version', () => {
    saveConsent({ analytics: true, marketing: false })
    const loaded = loadConsent()
    expect(loaded).toMatchObject({
      analytics: true,
      marketing: false,
      version: CONSENT_POLICY_VERSION,
    })
    expect(loaded?.decidedAt).toBeTruthy()
  })

  it('treats a stored decision from an older policy version as "no decision"', () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ analytics: true, marketing: true, version: 'old', decidedAt: 'x' }),
    )
    expect(loadConsent()).toBeNull()
  })

  it('ignores malformed stored JSON', () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, '{not json')
    expect(loadConsent()).toBeNull()
  })
})
