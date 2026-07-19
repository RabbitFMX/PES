import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { logEntriesRouter } from './logEntries'
import type { ActivityRow, LogEntryRow, MemberRow, WeekRow } from '../db/types'

// Mock the DB layer so the tests drive the endpoints without a live Supabase.
const getActivity = vi.hoisted(() => vi.fn())
const getCurrentWeek = vi.hoisted(() => vi.fn())
const insertLogEntries = vi.hoisted(() => vi.fn())
const getWeeklyTotalPoints = vi.hoisted(() => vi.fn())
const hasDuplicateEntry = vi.hoisted(() => vi.fn())
const getLogEntryById = vi.hoisted(() => vi.fn())
const updateLogEntry = vi.hoisted(() => vi.fn())
const deleteLogEntry = vi.hoisted(() => vi.fn())

vi.mock('../db/activities', () => ({ getActivity }))
vi.mock('../db/weeks', () => ({ getCurrentWeek }))
vi.mock('../db/logEntries', () => ({
  insertLogEntries,
  getWeeklyTotalPoints,
  hasDuplicateEntry,
  getLogEntryById,
  updateLogEntry,
  deleteLogEntry,
}))

const memberRow: MemberRow = {
  id: 'user-1',
  name: 'Bára Nováková',
  email: 'bara@pes.dev',
  gender: 'f',
  coefficient: 1.25, // fenčí koeficient — 24 raw → 30 final
  division: 'A',
  role: 'member',
  status: 'active',
  joined_date: '2026-07-06',
  avatar_url: null,
  language_pref: 'cs',
  theme_pref: 'light',
  injury_exempt_until: null,
}

const runRow: ActivityRow = {
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

// A wide default range so both an explicit in-range detailed date and quick-add
// (which always dates to *today*, the real clock) fall inside it — this keeps
// the commit tests independent of the machine clock. The out-of-week test
// installs a narrow week and posts an explicitly out-of-range date instead.
const week: WeekRow = {
  id: 'week-1',
  round_id: 'round-1',
  week_number: 1,
  start_date: '2000-01-01',
  end_date: '2999-12-31',
}

/** A saved row, echoing the inserted values so toSavedLogEntry has real data. */
function savedRow(overrides: Partial<LogEntryRow> = {}): LogEntryRow {
  return {
    id: 'entry-1',
    member_id: memberRow.id,
    week_id: week.id,
    activity_id: 'run',
    activity_date: '2026-07-08',
    quantity: 8,
    unit: 'km',
    elevation_m: null,
    with_stroller: false,
    raw_points: 24,
    final_points: 30,
    source: 'manual',
    note: null,
    created_at: '2026-07-08T10:00:00Z',
    ...overrides,
  }
}

const memberDeps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: memberRow.id } : null),
  getMember: async () => memberRow,
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', logEntriesRouter, { deps: memberDeps })
  app.use(errorHandler)
  return app
}

function authed(method: 'get' | 'post' | 'patch' | 'delete', path: string) {
  return request(buildApp())[method](path).set('Authorization', 'Bearer valid')
}

beforeEach(() => {
  vi.clearAllMocks()
  getActivity.mockResolvedValue(runRow)
  getCurrentWeek.mockResolvedValue(week)
  hasDuplicateEntry.mockResolvedValue(false)
  insertLogEntries.mockResolvedValue([savedRow()])
  getWeeklyTotalPoints.mockResolvedValue(30)
  getLogEntryById.mockResolvedValue(savedRow())
  updateLogEntry.mockImplementation(async (_id, patch) => savedRow(patch))
  deleteLogEntry.mockResolvedValue(undefined)
})

describe('POST /api/log-entries/preview', () => {
  it('401s without a token', async () => {
    const res = await request(buildApp())
      .post('/api/log-entries/preview')
      .send({ activityId: 'run', quantity: 8 })
    expect(res.status).toBe(401)
  })

  it('detailed: returns the preview with server-computed finalPoints (8 km run ×1.25 = 30)', async () => {
    const res = await authed('post', '/api/log-entries/preview').send({
      activityId: 'run',
      quantity: 8,
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      activityName: 'běh',
      quantity: 8,
      unit: 'km',
      rawPoints: 24,
      coefficient: 1.25,
      finalPoints: 30,
    })
  })

  it('detailed: adds the stroller elevation bonus (8 km + 200 m with stroller = 34 → 42.5)', async () => {
    const res = await authed('post', '/api/log-entries/preview').send({
      activityId: 'run',
      quantity: 8,
      elevationM: 200,
      withStroller: true,
    })

    expect(res.status).toBe(200)
    expect(res.body.rawPoints).toBe(34)
    expect(res.body.finalPoints).toBe(42.5) // 34 × 1.25
  })

  it('quick-add: raw points pass through and ×1.25 still applies', async () => {
    const res = await authed('post', '/api/log-entries/preview').send({
      points: 10,
      note: 'edge case',
    })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      activityName: 'Rychlý zápis',
      quantity: 10,
      unit: 'pts',
      rawPoints: 10,
      coefficient: 1.25,
      finalPoints: 12.5,
    })
    expect(getActivity).not.toHaveBeenCalled()
  })

  it('404s an unknown activity', async () => {
    getActivity.mockResolvedValue(null)
    const res = await authed('post', '/api/log-entries/preview').send({
      activityId: 'nope',
      quantity: 5,
    })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'unknown_activity' })
  })

  it('400s an invalid body', async () => {
    const res = await authed('post', '/api/log-entries/preview').send({ quantity: -3 })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/log-entries (commit)', () => {
  it('inserts a row and returns the saved entry plus the new weekly total', async () => {
    getWeeklyTotalPoints.mockResolvedValue(94)
    const res = await authed('post', '/api/log-entries').send({
      activityId: 'run',
      quantity: 8,
      activityDate: '2026-07-08',
    })

    expect(res.status).toBe(201)
    expect(insertLogEntries).toHaveBeenCalledTimes(1)
    // Server-recomputed points are persisted, not any client-supplied value.
    const [rows] = insertLogEntries.mock.calls[0]
    expect(rows[0]).toMatchObject({
      member_id: 'user-1',
      week_id: 'week-1',
      activity_id: 'run',
      raw_points: 24,
      final_points: 30,
      source: 'manual',
    })
    expect(res.body.weeklyPoints).toBe(94)
    expect(res.body.entries).toHaveLength(1)
    expect(res.body.entries[0]).toMatchObject({ id: 'entry-1', activityId: 'run', finalPoints: 30 })
    expect(res.body.duplicate).toBe(false)
  })

  it('persists quick-add with a null activity_id and quick-add source', async () => {
    insertLogEntries.mockResolvedValue([
      savedRow({
        activity_id: null,
        unit: 'pts',
        quantity: 10,
        raw_points: 10,
        final_points: 12.5,
        source: 'quick-add',
      }),
    ])
    const res = await authed('post', '/api/log-entries').send({ points: 10 })

    expect(res.status).toBe(201)
    const [rows] = insertLogEntries.mock.calls[0]
    expect(rows[0]).toMatchObject({
      activity_id: null,
      source: 'quick-add',
      raw_points: 10,
      final_points: 12.5,
    })
    expect(res.body.entries[0].activityId).toBeNull()
  })

  it('rejects an entry dated outside the open week (400)', async () => {
    getCurrentWeek.mockResolvedValue({ ...week, start_date: '2026-07-06', end_date: '2026-07-12' })
    const res = await authed('post', '/api/log-entries').send({
      activityId: 'run',
      quantity: 8,
      activityDate: '2026-08-01',
    })

    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'date_outside_week' })
    expect(insertLogEntries).not.toHaveBeenCalled()
  })

  it('flags a duplicate but still saves it', async () => {
    hasDuplicateEntry.mockResolvedValue(true)
    const res = await authed('post', '/api/log-entries').send({
      activityId: 'run',
      quantity: 8,
      activityDate: '2026-07-08',
    })

    expect(res.status).toBe(201)
    expect(res.body.duplicate).toBe(true)
    expect(insertLogEntries).toHaveBeenCalledTimes(1)
  })

  it('409s when there is no open week', async () => {
    getCurrentWeek.mockResolvedValue(null)
    const res = await authed('post', '/api/log-entries').send({
      activityId: 'run',
      quantity: 8,
      activityDate: '2026-07-08',
    })
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'no_open_week' })
  })
})

describe('GET /api/log-entries/:id (load own for edit)', () => {
  it('401s without a token', async () => {
    const res = await request(buildApp()).get('/api/log-entries/entry-1')
    expect(res.status).toBe(401)
  })

  it('returns the owner’s entry', async () => {
    const res = await authed('get', '/api/log-entries/entry-1')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ id: 'entry-1', activityId: 'run', finalPoints: 30 })
  })

  it("404s another member's entry (no leak)", async () => {
    getLogEntryById.mockResolvedValue(savedRow({ member_id: 'someone-else' }))
    const res = await authed('get', '/api/log-entries/entry-1')
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/log-entries/:id (edit own)', () => {
  it('401s without a token', async () => {
    const res = await request(buildApp())
      .patch('/api/log-entries/entry-1')
      .send({ activityId: 'run', quantity: 8 })
    expect(res.status).toBe(401)
  })

  it('recomputes points server-side and returns the updated entry + weekly total', async () => {
    getWeeklyTotalPoints.mockResolvedValue(42)
    const res = await authed('patch', '/api/log-entries/entry-1').send({
      activityId: 'run',
      quantity: 10,
      activityDate: '2026-07-08',
    })

    expect(res.status).toBe(200)
    expect(updateLogEntry).toHaveBeenCalledTimes(1)
    const [id, patch] = updateLogEntry.mock.calls[0]
    expect(id).toBe('entry-1')
    // 10 km run raw = 30, ×1.25 = 37.5 — server value, not any client input.
    expect(patch).toMatchObject({ activity_id: 'run', raw_points: 30, final_points: 37.5 })
    expect(res.body.weeklyPoints).toBe(42)
    expect(res.body.entries).toHaveLength(1)
  })

  it("404s an entry that isn't the caller's (no existence leak)", async () => {
    getLogEntryById.mockResolvedValue(savedRow({ member_id: 'someone-else' }))
    const res = await authed('patch', '/api/log-entries/entry-1').send({
      activityId: 'run',
      quantity: 8,
    })
    expect(res.status).toBe(404)
    expect(updateLogEntry).not.toHaveBeenCalled()
  })

  it('404s a missing entry', async () => {
    getLogEntryById.mockResolvedValue(null)
    const res = await authed('patch', '/api/log-entries/nope').send({
      activityId: 'run',
      quantity: 8,
    })
    expect(res.status).toBe(404)
  })

  it('403s editing an entry from a past (non-current) week', async () => {
    getLogEntryById.mockResolvedValue(savedRow({ week_id: 'week-old' }))
    const res = await authed('patch', '/api/log-entries/entry-1').send({
      activityId: 'run',
      quantity: 8,
    })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'not_current_week' })
    expect(updateLogEntry).not.toHaveBeenCalled()
  })

  it('400s an invalid body', async () => {
    const res = await authed('patch', '/api/log-entries/entry-1').send({ quantity: -3 })
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/log-entries/:id (delete own)', () => {
  it('401s without a token', async () => {
    const res = await request(buildApp()).delete('/api/log-entries/entry-1')
    expect(res.status).toBe(401)
  })

  it('deletes the entry and returns the new weekly total', async () => {
    getWeeklyTotalPoints.mockResolvedValue(12)
    const res = await authed('delete', '/api/log-entries/entry-1')
    expect(res.status).toBe(200)
    expect(deleteLogEntry).toHaveBeenCalledWith('entry-1')
    expect(res.body).toEqual({ weeklyPoints: 12 })
  })

  it("404s deleting an entry that isn't the caller's", async () => {
    getLogEntryById.mockResolvedValue(savedRow({ member_id: 'someone-else' }))
    const res = await authed('delete', '/api/log-entries/entry-1')
    expect(res.status).toBe(404)
    expect(deleteLogEntry).not.toHaveBeenCalled()
  })

  it('403s deleting an entry from a past week', async () => {
    getLogEntryById.mockResolvedValue(savedRow({ week_id: 'week-old' }))
    const res = await authed('delete', '/api/log-entries/entry-1')
    expect(res.status).toBe(403)
    expect(deleteLogEntry).not.toHaveBeenCalled()
  })
})

describe('POST /api/log-entries/parse (deferred LLM)', () => {
  it('returns 501 not_implemented without crashing', async () => {
    const res = await authed('post', '/api/log-entries/parse').send({ text: 'ran 8k this morning' })
    expect(res.status).toBe(501)
    expect(res.body.error).toBe('not_implemented')
  })
})
