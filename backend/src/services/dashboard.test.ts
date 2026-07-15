import { describe, expect, it } from 'vitest'
import { computeStreak } from './dashboard'

describe('computeStreak', () => {
  it('counts consecutive completed weeks at goal, plus the current week if met', () => {
    // completed weeks 100,100,100 and the current week already at 120 → 4.
    expect(computeStreak([100, 100, 100], 120)).toBe(4)
  })

  it('does not break the streak for an in-progress current week below goal', () => {
    // current week 64 (<100) is still in progress → streak is the 6 completed
    // weeks before it (mirrors the frontend mock: weeklyPoints 64, streak 6).
    expect(computeStreak([100, 100, 100, 100, 100, 100], 64)).toBe(6)
  })

  it('stops at the most recent completed week below goal', () => {
    // ...100, 80, 100 (most recent completed) → only the last counts, current met → 2.
    expect(computeStreak([100, 80, 100], 100)).toBe(2)
  })

  it('is zero when there is no history and the current week is below goal', () => {
    expect(computeStreak([], 0)).toBe(0)
  })

  it('is one when the only week (current) already met the goal', () => {
    expect(computeStreak([], 100)).toBe(1)
  })
})
