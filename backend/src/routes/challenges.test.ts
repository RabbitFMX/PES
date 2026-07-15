import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { challengesRouter } from './challenges'
import type { ChallengeRow, MemberRow, WeekRow } from '../db/types'

// Mock the DB layer so the tests drive the endpoints without a live Supabase.
const getCurrentWeek = vi.hoisted(() => vi.fn())
const getChallengeForWeek = vi.hoisted(() => vi.fn())
const getChallengeById = vi.hoisted(() => vi.fn())
const countChallenges = vi.hoisted(() => vi.fn())
const insertChallenge = vi.hoisted(() => vi.fn())
const listSubmissions = vi.hoisted(() => vi.fn())
const upsertSubmission = vi.hoisted(() => vi.fn())
const setSubmissionScores = vi.hoisted(() => vi.fn())
const listClosedChallenges = vi.hoisted(() => vi.fn())
const getRotation = vi.hoisted(() => vi.fn())

vi.mock('../db/weeks', () => ({ getCurrentWeek }))
vi.mock('../db/challenges', () => ({
  getChallengeForWeek,
  getChallengeById,
  countChallenges,
  insertChallenge,
  listSubmissions,
  upsertSubmission,
  setSubmissionScores,
  listClosedChallenges,
}))
vi.mock('../db/rotation', () => ({ getRotation }))

function member(id: string): MemberRow {
  return {
    id,
    name: id === 'me' ? 'Bára Nováková' : id,
    email: `${id}@pes.dev`,
    gender: null,
    coefficient: 1,
    division: 'A',
    role: 'member',
    status: 'active',
    joined_date: '2026-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
  }
}

const me = member('me')

const memberDeps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: me.id } : null),
  getMember: async () => me,
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', challengesRouter, { deps: memberDeps })
  app.use(errorHandler)
  return app
}

const week: WeekRow = {
  id: 'week-1',
  round_id: 'round-1',
  week_number: 7,
  start_date: '2026-02-16',
  end_date: '2026-02-22',
}

const challenge: ChallengeRow = {
  id: 'ch-1',
  week_id: 'week-1',
  setter_member_id: 'm2',
  title: 'Nejvíc kliků',
  description: 'Do neděle.',
  deadline: '2026-02-22T21:00:00+01:00',
  status: 'open',
  created_at: '2026-02-16T08:00:00Z',
  bonus_split: null,
}

describe('Challenges API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentWeek.mockResolvedValue(week)
    getChallengeForWeek.mockResolvedValue(null)
    // Rotation of [me, m2]; with 0 challenges so far the current setter is `me`.
    getRotation.mockResolvedValue([
      { memberId: 'me', orderPosition: 0 },
      { memberId: 'm2', orderPosition: 1 },
    ])
    countChallenges.mockResolvedValue(0)
    listSubmissions.mockResolvedValue([])
    listClosedChallenges.mockResolvedValue([])
  })

  it('401s without a token', async () => {
    const res = await request(buildApp()).get('/api/challenges/current')
    expect(res.status).toBe(401)
  })

  it('returns id:null with the setter flag when no challenge is set this week', async () => {
    const res = await request(buildApp())
      .get('/api/challenges/current')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.id).toBeNull()
    expect(res.body.isSetterTurn).toBe(true) // `me` is the current setter
    expect(res.body.submissions).toEqual([])
  })

  it('lets the current setter create a challenge (201)', async () => {
    const res = await request(buildApp())
      .post('/api/challenges')
      .set('Authorization', 'Bearer valid')
      .send({
        title: 'Nejvíc kliků',
        description: 'Do neděle.',
        deadline: '2026-02-22T21:00:00+01:00',
      })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(insertChallenge).toHaveBeenCalledTimes(1)
    expect(insertChallenge.mock.calls[0][0]).toMatchObject({
      week_id: 'week-1',
      setter_member_id: 'me',
      title: 'Nejvíc kliků',
    })
  })

  it('rejects a non-setter creating a challenge (403)', async () => {
    countChallenges.mockResolvedValue(1) // rotation advances → setter is now m2

    const res = await request(buildApp())
      .post('/api/challenges')
      .set('Authorization', 'Bearer valid')
      .send({ title: 'X', deadline: '2026-02-22T21:00:00+01:00' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('not_setter')
    expect(insertChallenge).not.toHaveBeenCalled()
  })

  it('rejects creating when one already exists this week (409)', async () => {
    getChallengeForWeek.mockResolvedValue(challenge)

    const res = await request(buildApp())
      .post('/api/challenges')
      .set('Authorization', 'Bearer valid')
      .send({ title: 'X', deadline: '2026-02-22T21:00:00+01:00' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('challenge_exists')
  })

  it('accepts a submission and awards one rank/bonus per member (latest value)', async () => {
    getChallengeById.mockResolvedValue(challenge)
    // After the upsert, both members have a value; `me` leads.
    listSubmissions.mockResolvedValue([
      { memberId: 'me', displayName: 'Bára Nováková', value: 400 },
      { memberId: 'm2', displayName: 'Ondra', value: 300 },
    ])

    const res = await request(buildApp())
      .post('/api/challenges/ch-1/submissions')
      .set('Authorization', 'Bearer valid')
      .send({ value: 400 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    // Latest value is upserted (keep-latest is the unique-constraint upsert).
    expect(upsertSubmission).toHaveBeenCalledWith('ch-1', 'me', 400)
    // Exactly one score row per member (one award per member per challenge).
    const scores = setSubmissionScores.mock.calls[0][1]
    expect(scores).toEqual([
      { memberId: 'me', rank: 1, bonusPoints: 30 },
      { memberId: 'm2', rank: 2, bonusPoints: 20 },
    ])
  })

  it('shows a submitted value with its rank in the current challenge', async () => {
    getChallengeForWeek.mockResolvedValue(challenge)
    listSubmissions.mockResolvedValue([
      { memberId: 'me', displayName: 'Bára Nováková', value: 400 },
      { memberId: 'm2', displayName: 'Ondra', value: 300 },
    ])

    const res = await request(buildApp())
      .get('/api/challenges/current')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('ch-1')
    expect(res.body.hasSubmitted).toBe(true)
    expect(res.body.submissions).toEqual([
      { memberId: 'me', displayName: 'Bára Nováková', value: 400, rank: 1, bonusPoints: 30 },
      { memberId: 'm2', displayName: 'Ondra', value: 300, rank: 2, bonusPoints: 20 },
    ])
  })

  it('returns past challenges with the winner and week label', async () => {
    listClosedChallenges.mockResolvedValue([{ id: 'ch-0', title: 'Nejdelší běh', weekNumber: 6 }])
    listSubmissions.mockResolvedValue([
      { memberId: 'm2', displayName: 'Ondra Dvořák', value: 21 },
      { memberId: 'me', displayName: 'Bára Nováková', value: 12 },
    ])

    const res = await request(buildApp())
      .get('/api/challenges/past')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { id: 'ch-0', title: 'Nejdelší běh', winner: 'Ondra Dvořák', weekLabel: 'Týden 6' },
    ])
  })
})
