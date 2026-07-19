import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { leaderboardRouter } from './leaderboard'
import type { MemberRow, RoundRow, WeekRow } from '../db/types'

// Mock the DB layer so the test drives the endpoint without a live Supabase.
const listRounds = vi.hoisted(() => vi.fn())
const getMemberRoundDivisions = vi.hoisted(() => vi.fn())
const getCurrentWeek = vi.hoisted(() => vi.fn())
const listWeeksByRound = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
const listWeeksActivityPoints = vi.hoisted(() =>
  vi.fn<
    () => Promise<
      {
        member_id: string
        activity_id: string | null
        name_cs: string
        name_en: string
        points: number
      }[]
    >
  >(async () => []),
)
const listActiveMembers = vi.hoisted(() => vi.fn())

vi.mock('../db/rounds', () => ({ listRounds, getMemberRoundDivisions }))
vi.mock('../db/weeks', () => ({ getCurrentWeek, listWeeksByRound }))
vi.mock('../db/logEntries', () => ({ listRoundEntries, listWeeksActivityPoints }))
vi.mock('../db/members', () => ({ listActiveMembers }))

function member(id: string, name: string, division: 'A' | 'B'): MemberRow {
  return {
    id,
    name,
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

const me = member('me', 'Bára Nováková', 'A')

const memberDeps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: me.id } : null),
  getMember: async () => me,
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', leaderboardRouter, { deps: memberDeps })
  app.use(errorHandler)
  return app
}

const round: RoundRow = {
  id: 'round-1',
  name: 'Round 1',
  start_date: '2026-01-01',
  end_date: '2026-06-30',
  status: 'open',
}

function week(n: number): WeekRow {
  return {
    id: `week-${n}`,
    round_id: round.id,
    week_number: n,
    start_date: '2026-01-01',
    end_date: '2026-06-30',
  }
}

describe('GET /api/leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listRounds.mockResolvedValue([round])
    listWeeksActivityPoints.mockResolvedValue([]) // reset (clearAllMocks keeps impls)
    getCurrentWeek.mockResolvedValue(week(2))
    listWeeksByRound.mockResolvedValue([week(1), week(2)])
    getMemberRoundDivisions.mockResolvedValue([])
    listActiveMembers.mockResolvedValue([
      member('klara', 'Klára Horáková', 'A'),
      member('ondra', 'Ondra Dvořák', 'A'),
      member('me', 'Bára Nováková', 'A'),
      member('eva', 'Eva Pokorná', 'B'),
      member('tomas', 'Tomáš Marek', 'B'),
      member('jan', 'Jan Kučera', 'B'), // no activity → absent from the board
    ])
    listRoundEntries.mockResolvedValue([
      { member_id: 'klara', week_id: 'week-1', final_points: 1710 },
      { member_id: 'ondra', week_id: 'week-1', final_points: 1502 },
      { member_id: 'me', week_id: 'week-1', final_points: 1184 },
      { member_id: 'me', week_id: 'week-2', final_points: 100 }, // current week ≥ 100
      { member_id: 'eva', week_id: 'week-1', final_points: 980 },
      { member_id: 'tomas', week_id: 'week-1', final_points: 845 },
    ])
  })

  it('401s without a token', async () => {
    const res = await request(buildApp()).get('/api/leaderboard')
    expect(res.status).toBe(401)
  })

  it('returns two packs ordered best-first with exactly one current user', async () => {
    const res = await request(buildApp())
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.packA.map((r: { memberId: string }) => r.memberId)).toEqual([
      'klara',
      'ondra',
      'me',
    ])
    expect(res.body.packA.map((r: { rank: number }) => r.rank)).toEqual([1, 2, 3])
    expect(res.body.packB.map((r: { memberId: string }) => r.memberId)).toEqual(['eva', 'tomas'])

    // isCurrentUser is set on exactly one row across both packs.
    const flagged = [...res.body.packA, ...res.body.packB].filter(
      (r: { isCurrentUser: boolean }) => r.isCurrentUser,
    )
    expect(flagged).toHaveLength(1)
    expect(flagged[0].memberId).toBe('me')

    // Current-week goal status: only "me" logged ≥ 100 this week.
    const meRow = res.body.packA.find((r: { memberId: string }) => r.memberId === 'me')
    expect(meRow.goalMetThisWeek).toBe(true)
    const klara = res.body.packA.find((r: { memberId: string }) => r.memberId === 'klara')
    expect(klara.goalMetThisWeek).toBe(false)
  })

  it('attaches a per-user per-activity breakdown for the round', async () => {
    listWeeksActivityPoints.mockResolvedValue([
      { member_id: 'me', activity_id: 'run', name_cs: 'běh', name_en: 'Running', points: 900 },
      { member_id: 'me', activity_id: null, name_cs: '', name_en: '', points: 384 },
    ])

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.roundId).toBe('round-1')
    expect(res.body.isOpenRound).toBe(true)
    const meRow = res.body.packA.find((r: { memberId: string }) => r.memberId === 'me')
    // Sorted highest-first: run (900) before the quick-add bucket (384).
    expect(meRow.pointsByActivity).toEqual([
      { activityId: 'run', nameCs: 'běh', nameEn: 'Running', points: 900 },
      { activityId: null, nameCs: '', nameEn: '', points: 384 },
    ])
  })

  it('GET /api/rounds lists the browsable rounds', async () => {
    const res = await request(buildApp()).get('/api/rounds').set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: 'round-1',
        name: 'Round 1',
        status: 'open',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
      },
    ])
  })

  it('returns an empty pack when nobody in it logged activity', async () => {
    listRoundEntries.mockResolvedValue([
      { member_id: 'klara', week_id: 'week-1', final_points: 500 },
    ])

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.packA.map((r: { memberId: string }) => r.memberId)).toEqual(['klara'])
    expect(res.body.packB).toEqual([])
  })
})
