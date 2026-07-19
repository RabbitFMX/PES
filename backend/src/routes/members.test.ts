import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { membersRouter } from './members'
import type { MemberRow } from '../db/types'

const getMemberById = vi.hoisted(() => vi.fn())
const listAllMembers = vi.hoisted(() => vi.fn())
const listMemberEntriesDetailed = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
const listRounds = vi.hoisted(() => vi.fn())
const listWeeks = vi.hoisted(() => vi.fn())
const getCurrentWeek = vi.hoisted(() => vi.fn())

vi.mock('../db/members', () => ({ getMemberById, listAllMembers }))
vi.mock('../db/logEntries', () => ({ listMemberEntriesDetailed, listRoundEntries }))
vi.mock('../db/rounds', () => ({ listRounds }))
vi.mock('../db/weeks', () => ({ listWeeks, getCurrentWeek }))

function member(id: string, over: Partial<MemberRow> = {}): MemberRow {
  return {
    id,
    name: id,
    email: `${id}@pes.dev`,
    gender: null,
    coefficient: 1,
    division: 'A',
    role: 'member',
    status: 'active',
    joined_date: '2022-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
    is_historical: false,
    ...over,
  }
}

const deps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: 'viewer' } : null),
  getMember: async () => member('viewer'),
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', membersRouter, { deps })
  app.use(errorHandler)
  return app
}

function entry(over: Record<string, unknown>) {
  return {
    id: 'e-1',
    activityDate: '2026-07-07',
    quantity: 0,
    unit: 'pts',
    elevationM: 0,
    withStroller: false,
    finalPoints: 0,
    weekId: 'w',
    weekStartDate: '2026-07-06',
    weekNumber: 1,
    roundId: 'r',
    activityId: null,
    activityNameCs: null,
    activityNameEn: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  listRounds.mockResolvedValue([
    { id: 'r-open', name: 'R12', start_date: '2026-07-06', end_date: '2026-12-27', status: 'open' },
    {
      id: 'r-old',
      name: 'R11',
      start_date: '2026-01-06',
      end_date: '2026-06-27',
      status: 'closed',
    },
  ])
  listWeeks.mockResolvedValue([
    { id: 'w-old', round_id: 'r-old', start_date: '2026-01-06', week_number: 1 },
    { id: 'wc', round_id: 'r-open', start_date: '2026-07-06', week_number: 1 },
  ])
  getCurrentWeek.mockResolvedValue({
    id: 'wc',
    round_id: 'r-open',
    start_date: '2026-07-06',
    end_date: '2026-07-12',
    week_number: 1,
  })
})

describe('GET /api/members (directory)', () => {
  it('lists members ranked by lifetime points', async () => {
    listAllMembers.mockResolvedValue([member('kinky', { is_historical: true }), member('bob')])
    listRoundEntries.mockResolvedValue([
      { member_id: 'kinky', week_id: 'wc', final_points: 36 },
      { member_id: 'kinky', week_id: 'w-old', final_points: 300 },
    ])
    const res = await request(buildApp()).get('/api/members').set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body[0]).toMatchObject({ id: 'kinky', lifetimePoints: 336, isHistorical: true })
    expect(res.body[1]).toMatchObject({ id: 'bob', lifetimePoints: 0 })
  })
})

describe('GET /api/members/:id/overview', () => {
  it('404s an unknown member', async () => {
    getMemberById.mockResolvedValue(null)
    const res = await request(buildApp())
      .get('/api/members/nope/overview')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(404)
  })

  it('returns current-week activity detail + distance/elevation from detailed entries', async () => {
    getMemberById.mockResolvedValue(member('kinky'))
    listMemberEntriesDetailed.mockResolvedValue([
      // detailed run this week: 10 km, +200 m, 36 pts
      entry({
        activityDate: '2026-07-07',
        quantity: 10,
        unit: 'km',
        elevationM: 200,
        finalPoints: 36,
        weekId: 'wc',
        weekStartDate: '2026-07-06',
        roundId: 'r-open',
        activityId: 'run',
        activityNameCs: 'běh',
        activityNameEn: 'Running',
      }),
      // historical quick-add total (no activity)
      entry({
        quantity: 300,
        unit: 'pts',
        finalPoints: 300,
        weekId: 'w-old',
        weekStartDate: '2026-01-06',
        roundId: 'r-old',
      }),
    ])
    const res = await request(buildApp())
      .get('/api/members/kinky/overview')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.weekly.weeklyPoints).toBe(36)
    expect(res.body.currentWeekActivities).toHaveLength(1)
    expect(res.body.currentWeekActivities[0]).toMatchObject({
      activityName: 'běh',
      quantity: 10,
      unit: 'km',
      elevationM: 200,
      points: 36,
    })
    expect(res.body.records).toMatchObject({
      lifetimePoints: 336,
      totalKm: 10,
      totalElevation: 200,
    })
    // roundHistory chronological: R11 (300) then R12 (36)
    expect(res.body.roundHistory.map((r: { name: string }) => r.name)).toEqual(['R11', 'R12'])
    expect(res.body.distanceByActivity[0]).toMatchObject({ activityId: 'run', km: 10 })
    expect(res.body.topActivities[0].activityId).toBe('run')
  })
})
