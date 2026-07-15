import { describe, expect, it } from 'vitest'
import { buildLeaderboard, type LeaderboardMember } from './leaderboard'

const members: LeaderboardMember[] = [
  { id: 'a', displayName: 'Alena', avatarUrl: null, division: 'A' },
  { id: 'b', displayName: 'Bára', avatarUrl: null, division: 'A' },
  { id: 'c', displayName: 'Cyril', avatarUrl: null, division: 'A' },
  { id: 'd', displayName: 'Dana', avatarUrl: null, division: 'B' },
  { id: 'e', displayName: 'Emil', avatarUrl: null, division: 'B' }, // no activity
]

// current week = w2. a & b tie on round total (300); c trails; d leads pack B.
const roundEntries = [
  { memberId: 'a', weekId: 'w1', finalPoints: 200 },
  { memberId: 'a', weekId: 'w2', finalPoints: 100 }, // current week ≥ 100 → goal met
  { memberId: 'b', weekId: 'w1', finalPoints: 300 },
  { memberId: 'c', weekId: 'w1', finalPoints: 120 },
  { memberId: 'd', weekId: 'w1', finalPoints: 500 },
]

describe('buildLeaderboard', () => {
  it('sorts each pack by round total, sharing a rank on ties', () => {
    const { packA, packB } = buildLeaderboard({
      members,
      roundEntries,
      currentWeekId: 'w2',
      currentUserId: 'a',
    })

    // a and b both 300 → tie at rank 1; c is rank 3 (competition ranking).
    expect(packA.map((r) => [r.memberId, r.roundTotal, r.rank])).toEqual([
      ['a', 300, 1],
      ['b', 300, 1],
      ['c', 120, 3],
    ])
    // Pack B: only d logged; e (no activity) is absent.
    expect(packB.map((r) => r.memberId)).toEqual(['d'])
  })

  it('flags goal-met-this-week and the current user', () => {
    const { packA } = buildLeaderboard({
      members,
      roundEntries,
      currentWeekId: 'w2',
      currentUserId: 'a',
    })

    const a = packA.find((r) => r.memberId === 'a')!
    const b = packA.find((r) => r.memberId === 'b')!
    expect(a.goalMetThisWeek).toBe(true) // 100 in the current week
    expect(b.goalMetThisWeek).toBe(false) // nothing in the current week

    // isCurrentUser is set on exactly one row across both packs.
    const flagged = [...packA].filter((r) => r.isCurrentUser)
    expect(flagged.map((r) => r.memberId)).toEqual(['a'])
  })

  it('returns empty packs when nobody has logged activity', () => {
    const { packA, packB } = buildLeaderboard({
      members,
      roundEntries: [],
      currentWeekId: 'w2',
      currentUserId: 'a',
    })
    expect(packA).toEqual([])
    expect(packB).toEqual([])
  })
})
