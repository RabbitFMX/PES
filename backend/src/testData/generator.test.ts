import { describe, expect, it } from 'vitest'
import {
  generateActivityPoints,
  generateMemberDetailedEntries,
  generateWeekEntries,
  mulberry32,
  splitCents,
  type ActivityMeta,
} from './generator'
import type { MemberStatEntry } from '../db/logEntries'

const activities: ActivityMeta[] = [
  {
    id: 'run',
    unit: 'km',
    pointsPerUnit: 3,
    nameCs: 'běh',
    nameEn: 'Running',
    hasElevationBonus: true,
  },
  {
    id: 'swim',
    unit: 'km',
    pointsPerUnit: 15,
    nameCs: 'plavání',
    nameEn: 'Swimming',
    hasElevationBonus: false,
  },
  {
    id: 'pushups',
    unit: '10 reps',
    pointsPerUnit: 1,
    nameCs: 'kliky',
    nameEn: 'Push-ups',
    hasElevationBonus: false,
  },
  {
    id: 'tabata',
    unit: 'session',
    pointsPerUnit: 4,
    nameCs: 'tabata',
    nameEn: 'Tabata',
    hasElevationBonus: false,
  },
  {
    id: 'plank',
    unit: 'min',
    pointsPerUnit: 2,
    nameCs: 'plank',
    nameEn: 'Plank',
    hasElevationBonus: false,
  },
]

function centsOf(points: number): number {
  return Math.round(points * 100)
}

describe('splitCents', () => {
  const rng = mulberry32(1)
  it('splits into positive parts that sum exactly to the total', () => {
    for (const [total, parts] of [
      [10000, 5],
      [12345, 4],
      [7, 3],
      [1, 5],
    ] as const) {
      const out = splitCents(total, parts, mulberry32(total))
      expect(out.reduce((s, v) => s + v, 0)).toBe(total)
      expect(out.every((v) => v >= 0)).toBe(true)
    }
  })

  it('returns the whole total when parts <= 1', () => {
    expect(splitCents(500, 1, rng)).toEqual([500])
  })
})

describe('generateWeekEntries', () => {
  const week = { weekId: 'W1', weekStartDate: '2026-01-05', weekNumber: 1, roundId: 'R1' }

  it('sums exactly to the week total and stays within the week', () => {
    const entries = generateWeekEntries(week, 123.45, activities, 'alice')
    const sum = entries.reduce((s, e) => s + centsOf(e.finalPoints), 0)
    expect(sum).toBe(centsOf(123.45))
    for (const e of entries) {
      expect(e.activityId).toBeTruthy()
      expect(e.activityNameCs).toBeTruthy()
      expect(e.weekId).toBe('W1')
      // date within the Mon–Sun window
      expect(e.activityDate >= '2026-01-05' && e.activityDate <= '2026-01-11').toBe(true)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = generateWeekEntries(week, 88, activities, 'bob')
    const b = generateWeekEntries(week, 88, activities, 'bob')
    expect(a).toEqual(b)
  })

  it('returns nothing for a zero total', () => {
    expect(generateWeekEntries(week, 0, activities, 'x')).toEqual([])
  })
})

describe('generateMemberDetailedEntries', () => {
  it('preserves each week total exactly while filling per-activity detail', () => {
    const real: MemberStatEntry[] = [
      // Week 1: a quick-add total of 140 (no activity) + a detailed 20 → 160 total.
      mk('W1', '2026-01-05', 1, 'R1', 140, null),
      mk('W1', '2026-01-06', 1, 'R1', 20, 'run'),
      // Week 2: single quick-add total of 95.
      mk('W2', '2026-01-12', 2, 'R1', 95, null),
    ]
    const gen = generateMemberDetailedEntries(real, activities)

    const totalByWeek = (rows: { weekId: string; finalPoints: number }[]) => {
      const m = new Map<string, number>()
      for (const r of rows) m.set(r.weekId, (m.get(r.weekId) ?? 0) + centsOf(r.finalPoints))
      return m
    }
    // Every generated entry has a real activity now (detail is filled).
    expect(gen.every((e) => e.activityId !== null)).toBe(true)
    // Per-week totals match the real per-week totals (160 and 95).
    expect(totalByWeek(gen).get('W1')).toBe(centsOf(160))
    expect(totalByWeek(gen).get('W2')).toBe(centsOf(95))
  })
})

describe('generateActivityPoints', () => {
  it('distributes a member total across activities, summing exactly', () => {
    const rows = generateActivityPoints('alice', 250, activities)
    expect(rows.reduce((s, r) => s + centsOf(r.final_points), 0)).toBe(centsOf(250))
    expect(new Set(rows.map((r) => r.activity_id)).size).toBe(rows.length) // distinct activities
    expect(rows.every((r) => r.member_id === 'alice' && r.name_cs)).toBe(true)
  })

  it('is deterministic and empty for a zero total', () => {
    expect(generateActivityPoints('a', 0, activities)).toEqual([])
    expect(generateActivityPoints('a', 100, activities)).toEqual(
      generateActivityPoints('a', 100, activities),
    )
  })
})

function mk(
  weekId: string,
  date: string,
  weekNumber: number,
  roundId: string,
  finalPoints: number,
  activityId: string | null,
): MemberStatEntry {
  return {
    activityDate: date,
    quantity: 1,
    unit: 'km',
    elevationM: 0,
    finalPoints,
    weekId,
    weekStartDate: date,
    weekNumber,
    roundId,
    activityId,
    activityNameCs: activityId,
    activityNameEn: activityId,
  }
}
