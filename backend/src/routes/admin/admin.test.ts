import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../../middleware/auth'
import { errorHandler } from '../../middleware/errorHandler'
import { adminRouter } from './index'
import type { ActivityRow, MemberRow, RoundRow } from '../../db/types'

// Mock the DB layer so the tests drive the endpoints without a live Supabase.
const listAllMembers = vi.hoisted(() => vi.fn())
const getMemberByEmail = vi.hoisted(() => vi.fn())
const inviteAuthUser = vi.hoisted(() => vi.fn())
const insertMember = vi.hoisted(() => vi.fn())
const updateMember = vi.hoisted(() => vi.fn())
const listAllActivities = vi.hoisted(() => vi.fn())
const insertActivity = vi.hoisted(() => vi.fn())
const updateActivity = vi.hoisted(() => vi.fn())
const listRounds = vi.hoisted(() => vi.fn())
const insertRound = vi.hoisted(() => vi.fn())
const updateRound = vi.hoisted(() => vi.fn())
const getRotation = vi.hoisted(() => vi.fn())
const putRotation = vi.hoisted(() => vi.fn())

vi.mock('../../db/members', () => ({
  listAllMembers,
  getMemberByEmail,
  inviteAuthUser,
  insertMember,
  updateMember,
}))
vi.mock('../../db/activities', () => ({ listAllActivities, insertActivity, updateActivity }))
vi.mock('../../db/rounds', () => ({ listRounds, insertRound, updateRound }))
vi.mock('../../db/rotation', () => ({ getRotation, putRotation }))

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
const plainMember = member('mem-1', 'member')

function deps(who: MemberRow): AuthDeps {
  return {
    verifyToken: async (jwt) => (jwt === 'valid' ? { userId: who.id } : null),
    getMember: async () => who,
  }
}

function buildApp(who: MemberRow) {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', adminRouter, { admin: true, deps: deps(who) })
  app.use(errorHandler)
  return app
}

const activityRow: ActivityRow = {
  id: 'run',
  name_cs: 'běh',
  name_en: 'Running',
  unit: 'km',
  points_per_unit: 3,
  has_elevation_bonus: true,
  elevation_bonus_per_50m: 1.5,
  elevation_bonus_per_50m_stroller: 2.5,
  has_stroller_option: true,
  stroller_base_rate_override: null,
  is_tiered: false,
  tier_options: null,
  notes: null,
  active: true,
}

const roundRow: RoundRow = {
  id: 'round-1',
  name: 'Round 1',
  start_date: '2026-01-05',
  end_date: '2026-06-28',
  status: 'open',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Admin API guard', () => {
  it('403s a member token on an admin route', async () => {
    const res = await request(buildApp(plainMember))
      .get('/api/admin/members')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(403)
  })

  it('401s without a token', async () => {
    const res = await request(buildApp(admin)).get('/api/admin/members')
    expect(res.status).toBe(401)
  })
})

describe('Admin members', () => {
  it('lists all members for an admin', async () => {
    listAllMembers.mockResolvedValue([member('a', 'member'), member('b', 'admin')])
    const res = await request(buildApp(admin))
      .get('/api/admin/members')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0]).toMatchObject({ id: 'a', displayName: 'a', role: 'member' })
  })

  it('invites a new member (201)', async () => {
    getMemberByEmail.mockResolvedValue(null)
    inviteAuthUser.mockResolvedValue({ userId: 'new-uuid' })
    insertMember.mockResolvedValue(member('new-uuid', 'member'))

    const res = await request(buildApp(admin))
      .post('/api/admin/members/invite')
      .set('Authorization', 'Bearer valid')
      .send({ email: 'newbie@pes.dev' })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(inviteAuthUser).toHaveBeenCalledWith('newbie@pes.dev')
    expect(insertMember.mock.calls[0][0]).toMatchObject({ id: 'new-uuid', email: 'newbie@pes.dev' })
  })

  it('rejects a duplicate-email invite with { ok: false }', async () => {
    getMemberByEmail.mockResolvedValue(member('exists', 'member'))

    const res = await request(buildApp(admin))
      .post('/api/admin/members/invite')
      .set('Authorization', 'Bearer valid')
      .send({ email: 'dupe@pes.dev' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toMatch(/already exists/i)
    expect(inviteAuthUser).not.toHaveBeenCalled()
  })

  it('edits a member', async () => {
    updateMember.mockResolvedValue(member('mem-1', 'member'))
    const res = await request(buildApp(admin))
      .patch('/api/admin/members/mem-1')
      .set('Authorization', 'Bearer valid')
      .send({ division: 'B', coefficient: 1.25 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(updateMember).toHaveBeenCalledWith('mem-1', { division: 'B', coefficient: 1.25 })
  })

  it('rejects an invalid coefficient with a message', async () => {
    const res = await request(buildApp(admin))
      .patch('/api/admin/members/mem-1')
      .set('Authorization', 'Bearer valid')
      .send({ coefficient: 2 })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(updateMember).not.toHaveBeenCalled()
  })
})

describe('Admin activities', () => {
  it('lists all activities including inactive', async () => {
    listAllActivities.mockResolvedValue([activityRow, { ...activityRow, id: 'old', active: false }])
    const res = await request(buildApp(admin))
      .get('/api/admin/activities')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body.map((a: { id: string }) => a.id)).toContain('old')
  })

  it('creates an activity (201)', async () => {
    listAllActivities.mockResolvedValue([])
    insertActivity.mockResolvedValue(activityRow)
    const res = await request(buildApp(admin))
      .post('/api/admin/activities')
      .set('Authorization', 'Bearer valid')
      .send({ id: 'swim', nameCs: 'plavání', nameEn: 'Swimming', unit: 'km' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
  })

  it('rejects a create missing nameEn (validation)', async () => {
    const res = await request(buildApp(admin))
      .post('/api/admin/activities')
      .set('Authorization', 'Bearer valid')
      .send({ id: 'swim', nameCs: 'plavání', unit: 'km' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toMatch(/nameEn/)
    expect(insertActivity).not.toHaveBeenCalled()
  })

  it('rejects a tiered activity with empty tierOptions', async () => {
    const res = await request(buildApp(admin))
      .post('/api/admin/activities')
      .set('Authorization', 'Bearer valid')
      .send({ id: 't', nameCs: 'a', nameEn: 'b', unit: 'pts', isTiered: true, tierOptions: [] })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toMatch(/tierOptions/)
  })

  it('warns on a duplicate name within a language but still creates', async () => {
    listAllActivities.mockResolvedValue([activityRow]) // name_en 'Running'
    insertActivity.mockResolvedValue(activityRow)
    const res = await request(buildApp(admin))
      .post('/api/admin/activities')
      .set('Authorization', 'Bearer valid')
      .send({ id: 'run2', nameCs: 'běh 2', nameEn: 'Running', unit: 'km' })
    expect(res.status).toBe(201)
    expect(res.body.ok).toBe(true)
    expect(res.body.warning).toMatch(/English/)
  })

  it('edits an activity', async () => {
    updateActivity.mockResolvedValue(activityRow)
    const res = await request(buildApp(admin))
      .patch('/api/admin/activities/run')
      .set('Authorization', 'Bearer valid')
      .send({ active: false, pointsPerUnit: 4 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(updateActivity).toHaveBeenCalledWith('run', { active: false, points_per_unit: 4 })
  })
})

describe('Admin rounds', () => {
  it('creates the next round as upcoming (201)', async () => {
    insertRound.mockResolvedValue({ ...roundRow, id: 'r2', status: 'upcoming' })
    const res = await request(buildApp(admin))
      .post('/api/admin/rounds')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Round 2', startDate: '2026-07-06', endDate: '2026-12-27' })
    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(insertRound.mock.calls[0][0]).toMatchObject({ name: 'Round 2', status: 'upcoming' })
  })

  it('flips a round status on close', async () => {
    updateRound.mockResolvedValue({ ...roundRow, status: 'closed' })
    const res = await request(buildApp(admin))
      .patch('/api/admin/rounds/round-1')
      .set('Authorization', 'Bearer valid')
      .send({ status: 'closed' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(updateRound).toHaveBeenCalledWith('round-1', { status: 'closed' })
  })
})

describe('Admin rotation', () => {
  it('returns the rotation with display names', async () => {
    getRotation.mockResolvedValue([
      { memberId: 'a', orderPosition: 0 },
      { memberId: 'b', orderPosition: 1 },
    ])
    listAllMembers.mockResolvedValue([member('a', 'member'), member('b', 'member')])
    const res = await request(buildApp(admin))
      .get('/api/admin/rotation')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      { memberId: 'a', displayName: 'a', orderPosition: 0 },
      { memberId: 'b', displayName: 'b', orderPosition: 1 },
    ])
  })

  it('persists a reordered rotation (PUT round-trips)', async () => {
    putRotation.mockResolvedValue(undefined)
    const res = await request(buildApp(admin))
      .put('/api/admin/rotation')
      .set('Authorization', 'Bearer valid')
      .send({ memberIds: ['b', 'a', 'c'] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(putRotation).toHaveBeenCalledWith(['b', 'a', 'c'])
  })
})
