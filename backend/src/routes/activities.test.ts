import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { activitiesRouter } from './activities'
import type { ActivityRow, MemberRow } from '../db/types'

// The route calls the service, which calls the DB layer. Mock the DB layer so
// the test drives the endpoint without a live Supabase.
const listActiveActivities = vi.hoisted(() => vi.fn())
vi.mock('../db/activities', () => ({ listActiveActivities }))

const memberRow: MemberRow = {
  id: 'user-1',
  name: 'Bára Nováková',
  email: 'bara@pes.dev',
  gender: 'f',
  coefficient: 1.25,
  division: 'A',
  role: 'member',
  status: 'active',
  joined_date: '2026-07-06',
  avatar_url: null,
  language_pref: 'cs',
  theme_pref: 'light',
  injury_exempt_until: null,
}

/** Auth deps that accept the token 'valid' and resolve to the given member. */
const memberDeps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: memberRow.id } : null),
  getMember: async () => memberRow,
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', activitiesRouter, { deps: memberDeps })
  app.use(errorHandler)
  return app
}

/** Build a snake_case activity row; every 7th is tiered (mirrors the seeded mix). */
function makeRow(i: number): ActivityRow {
  const tiered = i % 7 === 0
  return {
    id: `activity-${i}`,
    name_cs: `aktivita ${i}`,
    name_en: `activity ${i}`,
    unit: tiered ? 'pts' : 'km',
    points_per_unit: tiered ? 0 : 3,
    has_elevation_bonus: false,
    elevation_bonus_per_50m: null,
    elevation_bonus_per_50m_stroller: null,
    has_stroller_option: false,
    stroller_base_rate_override: null,
    is_tiered: tiered,
    tier_options: tiered ? [5, 10, 15, 30] : null,
    notes: null,
    active: true,
  }
}

// 35 rows — the count seeded from supabase/seed.sql (§14 rate table).
const SEEDED_ROWS: ActivityRow[] = Array.from({ length: 35 }, (_, i) => makeRow(i))

describe('GET /api/activities', () => {
  beforeEach(() => {
    listActiveActivities.mockReset()
    listActiveActivities.mockResolvedValue(SEEDED_ROWS)
  })

  it('401s without a token', async () => {
    const res = await request(buildApp()).get('/api/activities')
    expect(res.status).toBe(401)
  })

  it('401s with an invalid token', async () => {
    const res = await request(buildApp()).get('/api/activities').set('Authorization', 'Bearer nope')
    expect(res.status).toBe(401)
  })

  it('returns 200 and the 35 active activities in camelCase for a member token', async () => {
    const res = await request(buildApp())
      .get('/api/activities')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(35)

    // Every row is camelCase (no snake_case keys leaked through).
    for (const row of res.body) {
      for (const key of Object.keys(row)) {
        expect(key).not.toContain('_')
      }
    }

    // Tiered rows carry their tierOptions preset array.
    const tiered = res.body.filter((a: { isTiered: boolean }) => a.isTiered)
    expect(tiered.length).toBeGreaterThan(0)
    for (const row of tiered) {
      expect(Array.isArray(row.tierOptions)).toBe(true)
      expect(row.tierOptions.length).toBeGreaterThan(0)
    }
  })

  it('maps a row to the exact frontend Activity shape', async () => {
    listActiveActivities.mockResolvedValue([
      {
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
      } satisfies ActivityRow,
    ])

    const res = await request(buildApp())
      .get('/api/activities')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body[0]).toEqual({
      id: 'run',
      nameCs: 'běh',
      nameEn: 'Running',
      unit: 'km',
      pointsPerUnit: 3,
      hasElevationBonus: true,
      elevationBonusPer50m: 1.5,
      elevationBonusPer50mStroller: 2.5,
      hasStrollerOption: true,
      strollerBaseRateOverride: null,
      isTiered: false,
      tierOptions: null,
      notes: null,
      active: true,
    })
  })
})
