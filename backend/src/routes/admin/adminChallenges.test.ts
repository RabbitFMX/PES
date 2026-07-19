import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../../middleware/auth'
import { errorHandler } from '../../middleware/errorHandler'
import { adminChallengesRouter } from './challenges'
import type { ChallengeRow, MemberRow, WeekRow } from '../../db/types'

const getCurrentWeek = vi.hoisted(() => vi.fn())
const getChallengeForWeek = vi.hoisted(() => vi.fn())
const getChallengeById = vi.hoisted(() => vi.fn())
const listSubmissions = vi.hoisted(() => vi.fn())
const upsertBonusAward = vi.hoisted(() => vi.fn())
const listActiveMembers = vi.hoisted(() => vi.fn())

vi.mock('../../db/weeks', () => ({ getCurrentWeek }))
vi.mock('../../db/challenges', () => ({
  getChallengeForWeek,
  getChallengeById,
  listSubmissions,
  upsertBonusAward,
}))
vi.mock('../../db/members', () => ({ listActiveMembers }))

function member(id: string, role: 'member' | 'admin'): MemberRow {
  return {
    id,
    name: id,
    email: `${id}@pes.dev`,
    gender: null,
    coefficient: 1,
    division: 'A',
    role,
    status: 'active',
    joined_date: '2026-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
  }
}

const admin = member('admin-1', 'admin')

function buildApp(who: MemberRow) {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', adminChallengesRouter, {
    admin: true,
    deps: {
      verifyToken: async (jwt) => (jwt === 'valid' ? { userId: who.id } : null),
      getMember: async () => who,
    } as AuthDeps,
  })
  app.use(errorHandler)
  return app
}

const week: WeekRow = {
  id: 'week-1',
  round_id: 'r1',
  week_number: 1,
  start_date: '2026-02-16',
  end_date: '2026-02-22',
}

const challenge: ChallengeRow = {
  id: 'ch-1',
  week_id: 'week-1',
  setter_member_id: 'm2',
  title: 'Úklid boudy',
  description: 'Kdo uklidí.',
  deadline: null,
  status: 'open',
  created_at: '2026-02-16T08:00:00Z',
  bonus_split: null,
  scoring_mode: 'completion',
}

describe('Admin challenge scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentWeek.mockResolvedValue(week)
    getChallengeForWeek.mockResolvedValue(challenge)
    getChallengeById.mockResolvedValue(challenge)
    listSubmissions.mockResolvedValue([
      { memberId: 'a', displayName: 'A', value: null, rank: null, bonusPoints: 20 },
    ])
    listActiveMembers.mockResolvedValue([member('a', 'member'), member('b', 'member')])
    upsertBonusAward.mockResolvedValue(undefined)
  })

  it('403s a member on the admin scoring route', async () => {
    const res = await request(buildApp(member('m', 'member')))
      .get('/api/admin/challenges/current')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(403)
  })

  it('returns the roster with current awards', async () => {
    const res = await request(buildApp(admin))
      .get('/api/admin/challenges/current')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body.challengeId).toBe('ch-1')
    expect(res.body.scoringMode).toBe('completion')
    expect(res.body.members).toEqual([
      { memberId: 'a', displayName: 'a', division: 'A', points: 20 },
      { memberId: 'b', displayName: 'b', division: 'A', points: 0 },
    ])
  })

  it('awards completion points to members', async () => {
    const res = await request(buildApp(admin))
      .put('/api/admin/challenges/ch-1/scores')
      .set('Authorization', 'Bearer valid')
      .send({
        scores: [
          { memberId: 'a', points: 30 },
          { memberId: 'b', points: 10 },
        ],
      })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(upsertBonusAward).toHaveBeenCalledWith('ch-1', 'a', 30)
    expect(upsertBonusAward).toHaveBeenCalledWith('ch-1', 'b', 10)
  })

  it('404s scoring a missing challenge', async () => {
    getChallengeById.mockResolvedValue(null)
    const res = await request(buildApp(admin))
      .put('/api/admin/challenges/nope/scores')
      .set('Authorization', 'Bearer valid')
      .send({ scores: [{ memberId: 'a', points: 5 }] })
    expect(res.body).toEqual({ ok: false, message: 'not_found' })
    expect(upsertBonusAward).not.toHaveBeenCalled()
  })
})
