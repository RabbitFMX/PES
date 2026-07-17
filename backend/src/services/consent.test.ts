import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { hashIp, mayReceiveMarketingEmail, recordConsent } from './consent'
import type { MemberRow } from '../db/types'

const insertConsentLog = vi.hoisted(() => vi.fn())
const updateMemberConsent = vi.hoisted(() => vi.fn())
vi.mock('../db/consent', () => ({ insertConsentLog }))
vi.mock('../db/members', () => ({ updateMemberConsent }))

function member(over: Partial<MemberRow> = {}): MemberRow {
  return {
    id: 'm1',
    name: 'M',
    email: 'm@pes.dev',
    gender: null,
    coefficient: 1,
    division: 'A',
    role: 'member',
    status: 'active',
    joined_date: '2020-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
    ...over,
  }
}

const policy = { policyVersion: '2026-07-17', policyHash: 'abc123' }

beforeEach(() => vi.clearAllMocks())
afterEach(() => delete process.env.CONSENT_IP_SALT)

describe('hashIp', () => {
  it('returns null for a missing IP (nothing to hash)', () => {
    expect(hashIp(undefined)).toBeNull()
    expect(hashIp('')).toBeNull()
  })

  it('never returns the raw IP, and is deterministic for the same salt', () => {
    process.env.CONSENT_IP_SALT = 'salt'
    const a = hashIp('203.0.113.7')
    const b = hashIp('203.0.113.7')
    expect(a).toBe(b)
    expect(a).not.toContain('203.0.113.7')
    expect(a).toMatch(/^[0-9a-f]{64}$/) // sha256 hex
  })

  it('changes with the salt', () => {
    process.env.CONSENT_IP_SALT = 'salt-a'
    const a = hashIp('203.0.113.7')
    process.env.CONSENT_IP_SALT = 'salt-b'
    expect(hashIp('203.0.113.7')).not.toBe(a)
  })
})

describe('mayReceiveMarketingEmail', () => {
  it('is false unless the member explicitly consented', () => {
    expect(mayReceiveMarketingEmail(member())).toBe(false)
    expect(mayReceiveMarketingEmail(member({ marketing_consent: false }))).toBe(false)
    expect(mayReceiveMarketingEmail(member({ marketing_consent: true }))).toBe(true)
  })
})

describe('recordConsent', () => {
  it('logs one audit row per provided category with the hashed IP and policy', async () => {
    await recordConsent(
      { consents: { analytics: true, marketing: false }, ...policy },
      { memberId: 'm1', ip: '203.0.113.7', userAgent: 'jsdom' },
    )

    expect(insertConsentLog).toHaveBeenCalledTimes(1)
    const rows = insertConsentLog.mock.calls[0][0]
    expect(rows).toHaveLength(2)
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ consent_type: 'analytics', granted: true, member_id: 'm1' }),
        expect.objectContaining({ consent_type: 'marketing', granted: false, member_id: 'm1' }),
      ]),
    )
    expect(rows[0].policy_version).toBe('2026-07-17')
    expect(rows[0].policy_hash).toBe('abc123')
    expect(rows[0].ip_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(rows[0].ip_hash).not.toBe('203.0.113.7')
  })

  it('updates the member consent flags for a known member', async () => {
    await recordConsent(
      { consents: { marketing: true }, ...policy },
      { memberId: 'm1', ip: undefined, userAgent: undefined },
    )
    expect(updateMemberConsent).toHaveBeenCalledWith('m1', { marketing_consent: true })
  })

  it('logs anonymously (member_id null) and does not touch member flags', async () => {
    await recordConsent(
      { consents: { analytics: true, marketing: true }, ...policy },
      { memberId: null, ip: '203.0.113.7', userAgent: undefined },
    )
    const rows = insertConsentLog.mock.calls[0][0]
    expect(rows.every((r: { member_id: string | null }) => r.member_id === null)).toBe(true)
    expect(updateMemberConsent).not.toHaveBeenCalled()
  })
})
