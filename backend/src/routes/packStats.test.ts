import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { packStatsRouter } from './packStats'
import type { MemberRow } from '../db/types'

const listRounds = vi.hoisted(() => vi.fn())
const listWeeks = vi.hoisted(() => vi.fn())
const listAllMembers = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
const listDetailedActivityPoints = vi.hoisted(() => vi.fn())

vi.mock('../db/rounds', () => ({ listRounds }))
vi.mock('../db/weeks', () => ({ listWeeks }))
vi.mock('../db/members', () => ({ listAllMembers }))
vi.mock('../db/logEntries', () => ({ listRoundEntries, listDetailedActivityPoints }))

function member(id: string, division: 'A' | 'B'): MemberRow {
  return {
    id, name: id, email: `${id}@pes.dev`, gender: null, coefficient: 1,
    division, role: 'member', status: 'active', joined_date: '2022-01-01',
    avatar_url: null, language_pref: 'cs', theme_pref: 'light', injury_exempt_until: null,
  }
}

const deps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: 'alice' } : null),
  getMember: async () => member('alice', 'A'),
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', packStatsRouter, { deps })
  app.use(errorHandler)
  return app
}

beforeEach(() => {
  vi.clearAllMocks()
  listRounds.mockResolvedValue([
    { id: 'r-new', name: 'R-new', start_date: '2026-07-06', end_date: '2026-12-27', status: 'open' },
    { id: 'r-old', name: 'R-old', start_date: '2022-01-03', end_date: '2022-06-27', status: 'closed' },
  ])
  listWeeks.mockResolvedValue([
    { id: 'w1', round_id: 'r-old', start_date: '2022-01-03', week_number: 1 },
    { id: 'w2', round_id: 'r-new', start_date: '2026-07-06', week_number: 1 },
  ])
  listAllMembers.mockResolvedValue([member('alice', 'A'), member('bob', 'B')])
  listRoundEntries.mockResolvedValue([
    { member_id: 'alice', week_id: 'w1', final_points: 100 },
    { member_id: 'bob', week_id: 'w1', final_points: 50 },
    { member_id: 'alice', week_id: 'w2', final_points: 30 },
    { member_id: 'bob', week_id: 'w2', final_points: 40 },
  ])
  listDetailedActivityPoints.mockResolvedValue([
    { member_id: 'alice', activity_id: 'run', name_cs: 'běh', name_en: 'Running', final_points: 20 },
    { member_id: 'alice', activity_id: 'swim', name_cs: 'plavání', name_en: 'Swim', final_points: 10 },
  ])
})

describe('GET /api/pack-stats', () => {
  it('401s without a token', async () => {
    expect((await request(buildApp()).get('/api/pack-stats')).status).toBe(401)
  })

  it('ranks members by lifetime points and finds per-round winners', async () => {
    const res = await request(buildApp()).get('/api/pack-stats').set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)

    expect(res.body.totals).toMatchObject({ rounds: 2, members: 2, currentRoundName: 'R-new' })
    // all-time: alice 130 (rank 1), bob 90
    expect(res.body.allTime[0]).toMatchObject({ memberId: 'alice', lifetimePoints: 130, roundsPlayed: 2, wins: 1 })
    expect(res.body.allTime[1]).toMatchObject({ memberId: 'bob', lifetimePoints: 90, wins: 1 })

    // rounds chronological: R-old first, winner alice; R-new second, winner bob
    expect(res.body.rounds.map((r: { name: string }) => r.name)).toEqual(['R-old', 'R-new'])
    expect(res.body.rounds[0].winner).toMatchObject({ displayName: 'alice', total: 100 })
    expect(res.body.rounds[1].winner).toMatchObject({ displayName: 'bob', total: 40 })

    // compare matrix aligned to rounds order
    const alice = res.body.roundTotals.find((m: { memberId: string }) => m.memberId === 'alice')
    expect(alice.totals).toEqual([100, 30])

    // strongest activities (detailed entries): run (20) ahead of swim (10)
    const aliceAllTime = res.body.allTime.find((m: { memberId: string }) => m.memberId === 'alice')
    expect(aliceAllTime.topActivities.map((a: { activityId: string }) => a.activityId)).toEqual(['run', 'swim'])
    const bobAllTime = res.body.allTime.find((m: { memberId: string }) => m.memberId === 'bob')
    expect(bobAllTime.topActivities).toEqual([])
  })
})
