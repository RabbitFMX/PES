import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { leaderboardRouter } from './leaderboard'
import type { MemberRow, RoundRow, WeekRow } from '../db/types'

// Mock the DB layer so the test drives the endpoint without a live Supabase.
const getOpenRound = vi.hoisted(() => vi.fn())
const getMemberRoundDivisions = vi.hoisted(() => vi.fn())
const getCurrentWeek = vi.hoisted(() => vi.fn())
const listWeeksByRound = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
const listActiveMembers = vi.hoisted(() => vi.fn())

vi.mock('../db/rounds', () => ({ getOpenRound, getMemberRoundDivisions }))
vi.mock('../db/weeks', () => ({ getCurrentWeek, listWeeksByRound }))
vi.mock('../db/logEntries', () => ({ listRoundEntries }))
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
    getOpenRound.mockResolvedValue(round)
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
