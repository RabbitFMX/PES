import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { statsRouter } from './stats'
import type { MemberStatEntry } from '../db/logEntries'
import type { MemberRow, RoundRow, WeekRow } from '../db/types'

// Mock the DB layer so the test drives the endpoint without a live Supabase.
const listMemberEntriesDetailed = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
const listActiveMembers = vi.hoisted(() => vi.fn())
const getOpenRound = vi.hoisted(() => vi.fn())
const listRounds = vi.hoisted(() => vi.fn())
const listAllMemberRoundDivisions = vi.hoisted(() => vi.fn())
const listWeeks = vi.hoisted(() => vi.fn())
const getCurrentWeek = vi.hoisted(() => vi.fn())

vi.mock('../db/logEntries', () => ({ listMemberEntriesDetailed, listRoundEntries }))
vi.mock('../db/members', () => ({ listActiveMembers }))
vi.mock('../db/rounds', () => ({ getOpenRound, listRounds, listAllMemberRoundDivisions }))
vi.mock('../db/weeks', () => ({ listWeeks, getCurrentWeek }))

function member(id: string, division: 'A' | 'B'): MemberRow {
  return {
    id,
    name: id,
    email: `${id}@pes.dev`,
    gender: null,
    coefficient: 1,
    division,
    role: 'member',
    status: 'active',
    joined_date: '2026-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
  }
}

const me = member('me', 'A')

const memberDeps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: me.id } : null),
  getMember: async () => me,
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', statsRouter, { deps: memberDeps })
  app.use(errorHandler)
  return app
}

const openRound: RoundRow = {
  id: 'round-1',
  name: 'Round 1',
  start_date: '2026-01-01',
  end_date: '2026-06-30',
  status: 'open',
}
const closedRound: RoundRow = {
  id: 'round-0',
  name: 'Round 0',
  start_date: '2025-06-01',
  end_date: '2025-12-31',
  status: 'closed',
}

const week0: WeekRow = {
  id: 'week-0',
  round_id: 'round-0',
  week_number: 1,
  start_date: '2025-06-01',
  end_date: '2025-06-07',
}
const week1: WeekRow = {
  id: 'week-1',
  round_id: 'round-1',
  week_number: 1,
  start_date: '2026-01-05',
  end_date: '2026-01-11',
}
const week2: WeekRow = {
  id: 'week-2',
  round_id: 'round-1',
  week_number: 2,
  start_date: '2026-01-12',
  end_date: '2026-01-18',
}

function entry(overrides: Partial<MemberStatEntry>): MemberStatEntry {
  return {
    activityDate: '2026-01-05',
    quantity: 8,
    unit: 'km',
    elevationM: 0,
    finalPoints: 30,
    weekId: 'week-1',
    weekStartDate: '2026-01-05',
    weekNumber: 1,
    roundId: 'round-1',
    activityId: 'run',
    activityNameCs: 'běh',
    activityNameEn: 'Running',
    ...overrides,
  }
}

describe('GET /api/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOpenRound.mockResolvedValue(openRound)
    getCurrentWeek.mockResolvedValue(week2)
    listWeeks.mockResolvedValue([week0, week1, week2])
    listRounds.mockResolvedValue([openRound, closedRound])
    listAllMemberRoundDivisions.mockResolvedValue([])
    listActiveMembers.mockResolvedValue([member('me', 'A'), member('m2', 'A'), member('m3', 'B')])
    // Closed round-0 standings (pack A): m2 (800) > me (500) → me finishes 2nd.
    listRoundEntries.mockResolvedValue([
      { member_id: 'me', week_id: 'week-0', final_points: 500 },
      { member_id: 'm2', week_id: 'week-0', final_points: 800 },
      { member_id: 'm3', week_id: 'week-0', final_points: 300 },
    ])
    listMemberEntriesDetailed.mockResolvedValue([
      entry({ activityDate: '2026-01-05', quantity: 8, finalPoints: 30 }), // Mon, week-1
      entry({ activityDate: '2026-01-06', quantity: 5, finalPoints: 15 }), // Tue, week-1
      entry({
        activityDate: '2026-01-05', // Mon, week-1
        quantity: 4,
        finalPoints: 20,
        activityId: 'hike',
        activityNameCs: 'túra',
        activityNameEn: 'Hike',
      }),
      entry({
        activityDate: '2026-01-12', // Mon, week-2 (current week)
        quantity: 10,
        finalPoints: 40,
        weekId: 'week-2',
        weekStartDate: '2026-01-12',
        weekNumber: 2,
      }),
    ])
  })

  it('401s without a token', async () => {
    const res = await request(buildApp()).get('/api/stats')
    expect(res.status).toBe(401)
  })

  it('returns populated stats in the StatsData shape', async () => {
    const res = await request(buildApp()).get('/api/stats').set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.records).toEqual({
      bestWeek: 65, // week-1: 30 + 15 + 20
      bestRoundFinish: '2nd, Pack A', // closed round-0, division A, behind m2
      favouriteActivity: 'běh', // 3 run entries vs 1 hike (cs name)
      lifetimePoints: 105, // 30 + 15 + 20 + 40
      longestStreakWeeks: 0, // no week reached 100
      totalKmAllTime: 27, // 8 + 5 + 4 + 10 (all km)
      weeksAtGoal: 0,
    })
    // Points-over-time is scoped to the open round's weeks, zero-filled.
    expect(res.body.pointsOverTime).toEqual([
      { date: '2026-01-05', points: 65 },
      { date: '2026-01-12', points: 40 },
    ])
    // Day-of-week (lifetime): Mon 30+20+40=90, Tue 15.
    const dow = Object.fromEntries(
      res.body.pointsByDayOfWeek.map((d: { day: string; points: number }) => [d.day, d.points]),
    )
    expect(dow.Mon).toBe(90)
    expect(dow.Tue).toBe(15)
    expect(res.body.pointsByDayOfWeek).toHaveLength(7)
    // Current week (week-2): only the Monday 40.
    const cw = Object.fromEntries(
      res.body.currentWeekByDay.map((d: { day: string; points: number }) => [d.day, d.points]),
    )
    expect(cw.Mon).toBe(40)
    expect(res.body.currentWeekByDay).toHaveLength(7)
  })

  it('returns zeros and empty arrays for a member with no history', async () => {
    listMemberEntriesDetailed.mockResolvedValue([])
    listRoundEntries.mockResolvedValue([])
    getOpenRound.mockResolvedValue(null)
    getCurrentWeek.mockResolvedValue(null)
    listWeeks.mockResolvedValue([])
    listRounds.mockResolvedValue([])

    const res = await request(buildApp()).get('/api/stats').set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.records).toEqual({
      bestWeek: 0,
      bestRoundFinish: '—',
      favouriteActivity: '—',
      lifetimePoints: 0,
      longestStreakWeeks: 0,
      totalKmAllTime: 0,
      weeksAtGoal: 0,
    })
    expect(res.body.pointsOverTime).toEqual([])
    expect(res.body.routineDetected).toBeNull()
    // The day-of-week charts stay seven zeroed buckets so nothing breaks.
    expect(res.body.pointsByDayOfWeek).toHaveLength(7)
    expect(res.body.pointsByDayOfWeek.every((d: { points: number }) => d.points === 0)).toBe(true)
    expect(res.body.currentWeekByDay.every((d: { points: number }) => d.points === 0)).toBe(true)
  })

  it('accepts an explicit roundId to scope the line chart', async () => {
    const res = await request(buildApp())
      .get('/api/stats?roundId=round-0')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    // round-0 has only week-0, and the member logged no *detailed* entry there.
    expect(res.body.pointsOverTime).toEqual([{ date: '2025-06-01', points: 0 }])
  })
})
