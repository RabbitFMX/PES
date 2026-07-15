import { describe, expect, it } from 'vitest'
import { meetsWeeklyGoal, rankStandings, WEEKLY_GOAL } from './standings'

describe('rankStandings', () => {
  it('orders by roundTotal descending and assigns 1-based ranks', () => {
    const ranked = rankStandings([
      { memberId: 'a', roundTotal: 120 },
      { memberId: 'b', roundTotal: 300 },
      { memberId: 'c', roundTotal: 200 },
    ])
    expect(ranked).toEqual([
      { memberId: 'b', roundTotal: 300, rank: 1 },
      { memberId: 'c', roundTotal: 200, rank: 2 },
      { memberId: 'a', roundTotal: 120, rank: 3 },
    ])
  })

  it('shares a rank on ties and skips the next rank (competition ranking)', () => {
    const ranked = rankStandings([
      { memberId: 'a', roundTotal: 300 },
      { memberId: 'b', roundTotal: 300 },
      { memberId: 'c', roundTotal: 100 },
    ])
    // Two tied for 1st → both rank 1; the next is rank 3, not 2.
    expect(ranked.map((r) => [r.memberId, r.rank])).toEqual([
      ['a', 1],
      ['b', 1],
      ['c', 3],
    ])
  })

  it('breaks equal-total ordering by memberId for determinism', () => {
    const ranked = rankStandings([
      { memberId: 'z', roundTotal: 50 },
      { memberId: 'a', roundTotal: 50 },
    ])
    expect(ranked.map((r) => r.memberId)).toEqual(['a', 'z'])
    expect(ranked.every((r) => r.rank === 1)).toBe(true)
  })

  it('returns an empty array for no members', () => {
    expect(rankStandings([])).toEqual([])
  })
})

describe('meetsWeeklyGoal', () => {
  it('is true at or above the goal, false below', () => {
    expect(meetsWeeklyGoal(WEEKLY_GOAL)).toBe(true)
    expect(meetsWeeklyGoal(150)).toBe(true)
    expect(meetsWeeklyGoal(99)).toBe(false)
    expect(meetsWeeklyGoal(0)).toBe(false)
  })
})
