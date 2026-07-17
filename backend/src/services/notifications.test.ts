import { describe, expect, it } from 'vitest'
import { weeklyNudgeRecipients } from './notifications'
import type { MemberRow } from '../db/types'

function member(over: Partial<MemberRow> = {}): MemberRow {
  return {
    id: 'm',
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

describe('weeklyNudgeRecipients', () => {
  it('includes only active members who consented to marketing email', () => {
    const consented = member({ id: 'a', marketing_consent: true })
    const notConsented = member({ id: 'b', marketing_consent: false })
    const defaulted = member({ id: 'c' }) // no consent recorded ⇒ excluded
    const leftButConsented = member({ id: 'd', marketing_consent: true, status: 'left' })

    const out = weeklyNudgeRecipients([consented, notConsented, defaulted, leftButConsented])

    expect(out.map((m) => m.id)).toEqual(['a'])
  })

  it('withdrawing consent removes a member from the recipient list', () => {
    const before = weeklyNudgeRecipients([member({ id: 'a', marketing_consent: true })])
    expect(before.map((m) => m.id)).toEqual(['a'])

    const after = weeklyNudgeRecipients([member({ id: 'a', marketing_consent: false })])
    expect(after).toEqual([])
  })
})
