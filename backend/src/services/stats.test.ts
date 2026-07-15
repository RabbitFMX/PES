import { describe, expect, it } from 'vitest'
import { detectRoutine, favouriteActivity, longestStreakWeeks, ordinal, pointsByDay } from './stats'

// Anchor dates (verified): 2026-01-01 is a Thursday, so 2026-01-05 is a Monday
// and 2026-01-05..11 spans Mon→Sun.
describe('pointsByDay', () => {
  it('sums points into Mon–Sun buckets', () => {
    const result = pointsByDay([
      { date: '2026-01-05', points: 30 }, // Mon
      { date: '2026-01-05', points: 20 }, // Mon (same day, adds up)
      { date: '2026-01-06', points: 15 }, // Tue
      { date: '2026-01-11', points: 7 }, // Sun
    ])
    expect(result).toEqual([
      { day: 'Mon', points: 50 },
      { day: 'Tue', points: 15 },
      { day: 'Wed', points: 0 },
      { day: 'Thu', points: 0 },
      { day: 'Fri', points: 0 },
      { day: 'Sat', points: 0 },
      { day: 'Sun', points: 7 },
    ])
  })

  it('returns seven zeroed buckets for no entries (chart does not break)', () => {
    const result = pointsByDay([])
    expect(result).toHaveLength(7)
    expect(result.every((d) => d.points === 0)).toBe(true)
  })
})

describe('longestStreakWeeks', () => {
  it('finds the longest consecutive run at or above the goal', () => {
    // runs: [120,100]=2, then [100,100,100]=3 → best 3.
    expect(longestStreakWeeks([120, 100, 80, 100, 100, 100, 50])).toBe(3)
  })

  it('counts a run at the end of the series', () => {
    expect(longestStreakWeeks([50, 100, 100])).toBe(2)
  })

  it('is zero when nothing meets the goal', () => {
    expect(longestStreakWeeks([99, 40, 0])).toBe(0)
    expect(longestStreakWeeks([])).toBe(0)
  })
})

describe('favouriteActivity', () => {
  it('picks the most-logged activity (by entry count)', () => {
    expect(
      favouriteActivity([
        { activityName: 'běh', points: 30 },
        { activityName: 'běh', points: 15 },
        { activityName: 'túra', points: 40 },
      ]),
    ).toBe('běh')
  })

  it('breaks a count tie by total points', () => {
    expect(
      favouriteActivity([
        { activityName: 'běh', points: 30 },
        { activityName: 'túra', points: 40 },
      ]),
    ).toBe('túra')
  })

  it('ignores quick-add entries with no activity and returns null when empty', () => {
    expect(favouriteActivity([{ activityName: null, points: 99 }])).toBeNull()
    expect(favouriteActivity([])).toBeNull()
  })
})

describe('detectRoutine', () => {
  const today = '2026-01-21'
  function daily(name: string, from: string, count: number) {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(`${from}T00:00:00Z`)
      d.setUTCDate(d.getUTCDate() + i)
      return { activityName: name, date: d.toISOString().slice(0, 10) }
    })
  }

  it('reports a habit that hits the day threshold within the window', () => {
    // 12 distinct days in the last 21 (default minDays = 12) → detected.
    expect(detectRoutine(daily('kliky', '2026-01-05', 12), today)).toBe(
      'kliky 12 of the last 21 days',
    )
  })

  it('returns null below the threshold', () => {
    expect(detectRoutine(daily('kliky', '2026-01-05', 11), today)).toBeNull()
  })

  it('ignores days outside the 21-day window', () => {
    // 12 days but starting well before the window → none count.
    expect(detectRoutine(daily('kliky', '2025-11-01', 12), today)).toBeNull()
  })

  it('returns null with no named entries', () => {
    expect(detectRoutine([{ activityName: null, date: today }], today)).toBeNull()
  })
})

describe('ordinal', () => {
  it('formats ranks with the right suffix', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ])
  })
})
