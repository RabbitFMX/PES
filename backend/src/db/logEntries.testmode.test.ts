import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listMemberEntriesDetailed } from './logEntries'
import { runWithTestMode } from '../testData/context'
import type { Supabase } from './supabaseClient'

// activityMetas() calls listActiveActivities(client); give it a fixed palette.
const listActiveActivities = vi.hoisted(() => vi.fn())
vi.mock('./activities', () => ({ listActiveActivities }))

// A quick-add week (140) and a detailed entry (20) in W1 → real total 160.
const rawRows = [
  {
    activity_date: '2026-01-06',
    quantity: 0,
    unit: 'pts',
    elevation_m: null,
    final_points: 140,
    week_id: 'W1',
    activity_id: null,
    week: { start_date: '2026-01-05', week_number: 1, round_id: 'R1' },
    activity: null,
  },
  {
    activity_date: '2026-01-07',
    quantity: 5,
    unit: 'km',
    elevation_m: 0,
    final_points: 20,
    week_id: 'W1',
    activity_id: 'run',
    week: { start_date: '2026-01-05', week_number: 1, round_id: 'R1' },
    activity: { name_cs: 'běh', name_en: 'Running' },
  },
]

// Minimal fake Supabase: from().select().eq() resolves to the raw rows.
const fakeClient = {
  from: () => ({ select: () => ({ eq: () => Promise.resolve({ data: rawRows, error: null }) }) }),
} as unknown as Supabase

beforeEach(() => {
  vi.clearAllMocks()
  listActiveActivities.mockResolvedValue([
    {
      id: 'run',
      unit: 'km',
      points_per_unit: 3,
      name_cs: 'běh',
      name_en: 'Running',
      has_elevation_bonus: true,
    },
    {
      id: 'swim',
      unit: 'km',
      points_per_unit: 15,
      name_cs: 'plavání',
      name_en: 'Swimming',
      has_elevation_bonus: false,
    },
    {
      id: 'plank',
      unit: 'min',
      points_per_unit: 2,
      name_cs: 'plank',
      name_en: 'Plank',
      has_elevation_bonus: false,
    },
  ])
})

describe('listMemberEntriesDetailed test-data gating', () => {
  it('returns the real (sparse) rows when test mode is OFF', async () => {
    const rows = await listMemberEntriesDetailed('m', fakeClient)
    expect(rows).toHaveLength(2)
    expect(rows.some((r) => r.activityId === null)).toBe(true) // the quick-add row survives
    expect(listActiveActivities).not.toHaveBeenCalled()
  })

  it('returns generated detail preserving the week total when test mode is ON', async () => {
    const rows = await runWithTestMode(true, () => listMemberEntriesDetailed('m', fakeClient))

    // Every generated entry is a real activity now (detail is filled).
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => r.activityId !== null)).toBe(true)
    // The W1 total is preserved exactly (140 + 20 = 160).
    const w1Cents = rows
      .filter((r) => r.weekId === 'W1')
      .reduce((s, r) => s + Math.round(r.finalPoints * 100), 0)
    expect(w1Cents).toBe(16000)
    expect(listActiveActivities).toHaveBeenCalledOnce()
  })
})
