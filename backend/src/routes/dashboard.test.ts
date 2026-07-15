import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { dashboardRouter } from './dashboard'
import type { ChallengeRow, MemberRow, RoundRow, WeekRow } from '../db/types'

// Mock the DB layer so the test drives the endpoint without a live Supabase.
const getOpenRound = vi.hoisted(() => vi.fn())
const getMemberRoundDivisions = vi.hoisted(() => vi.fn())
const getCurrentWeek = vi.hoisted(() => vi.fn())
const listWeeksByRound = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
const listActiveMembers = vi.hoisted(() => vi.fn())
const getChallengeForWeek = vi.hoisted(() => vi.fn())
const hasSubmittedToChallenge = vi.hoisted(() => vi.fn())

vi.mock('../db/rounds', () => ({ getOpenRound, getMemberRoundDivisions }))
vi.mock('../db/weeks', () => ({ getCurrentWeek, listWeeksByRound }))
vi.mock('../db/logEntries', () => ({ listRoundEntries }))
vi.mock('../db/members', () => ({ listActiveMembers }))
vi.mock('../db/challenges', () => ({ getChallengeForWeek, hasSubmittedToChallenge }))

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

const me = member('user-1', 'A')

const memberDeps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: me.id } : null),
  getMember: async () => me,
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', dashboardRouter, { deps: memberDeps })
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

const challenge: ChallengeRow = {
  id: 'ch-1',
  week_id: 'week-3',
  setter_member_id: 'm2',
  title: 'Nejvíc kliků do neděle',
  description: null,
  deadline: null,
  status: 'open',
  created_at: '2026-02-01T00:00:00Z',
  bonus_split: null,
}

describe('GET /api/dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getOpenRound.mockResolvedValue(round)
    getCurrentWeek.mockResolvedValue(week(3))
    listWeeksByRound.mockResolvedValue([week(1), week(2), week(3)])
    getMemberRoundDivisions.mockResolvedValue([])
    listActiveMembers.mockResolvedValue([
      member('user-1', 'A'),
      member('m2', 'A'),
      member('m3', 'B'),
    ])
    // user-1: 100 + 100 + 64 = 264; m2: 120 + 90 + 200 = 410; m3 (pack B): 300.
    listRoundEntries.mockResolvedValue([
      { member_id: 'user-1', week_id: 'week-1', final_points: 100 },
      { member_id: 'user-1', week_id: 'week-2', final_points: 100 },
      { member_id: 'user-1', week_id: 'week-3', final_points: 64 },
      { member_id: 'm2', week_id: 'week-1', final_points: 120 },
      { member_id: 'm2', week_id: 'week-2', final_points: 90 },
      { member_id: 'm2', week_id: 'week-3', final_points: 200 },
      { member_id: 'm3', week_id: 'week-3', final_points: 300 },
    ])
    getChallengeForWeek.mockResolvedValue(challenge)
    hasSubmittedToChallenge.mockResolvedValue(true)
  })

  it('401s without a token', async () => {
    const res = await request(buildApp()).get('/api/dashboard')
    expect(res.status).toBe(401)
  })

  it('returns the member current-week summary in the DashboardData shape', async () => {
    const res = await request(buildApp()).get('/api/dashboard').set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      weeklyPoints: 64,
      weeklyGoal: 100,
      roundTotal: 264,
      // Pack A is user-1 (264) and m2 (410): m2 is 1st, user-1 is 2nd of 2.
      packRank: 2,
      packSize: 2,
      // Completed weeks 100, 100 both at goal; current week (64) in progress → 2.
      streakWeeks: 2,
      currentChallenge: { id: 'ch-1', title: 'Nejvíc kliků do neděle', hasSubmitted: true },
    })
  })

  it('returns zeros and null challenge for a member with no entries', async () => {
    listRoundEntries.mockResolvedValue([])
    getChallengeForWeek.mockResolvedValue(null)

    const res = await request(buildApp()).get('/api/dashboard').set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.weeklyPoints).toBe(0)
    expect(res.body.roundTotal).toBe(0)
    expect(res.body.streakWeeks).toBe(0)
    // The member is still counted in their pack (size 2, alone at rank 1).
    expect(res.body.packSize).toBe(2)
    expect(res.body.packRank).toBe(1)
    expect(res.body.currentChallenge).toBeNull()
  })

  it('returns an all-zero empty state when no round is open', async () => {
    getOpenRound.mockResolvedValue(null)
    getCurrentWeek.mockResolvedValue(null)

    const res = await request(buildApp()).get('/api/dashboard').set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      weeklyPoints: 0,
      weeklyGoal: 100,
      roundTotal: 0,
      packRank: 0,
      packSize: 0,
      streakWeeks: 0,
      currentChallenge: null,
    })
  })
})
