import { describe, expect, it } from 'vitest'
import express, { Router } from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from './auth'
import { errorHandler } from './errorHandler'
import { meRouter } from '../routes/me'
import type { MemberRow } from '../db/types'

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

const adminRow: MemberRow = { ...memberRow, id: 'admin-1', email: 'ondra@pes.dev', role: 'admin' }

/** Deps that accept the token 'valid' and resolve to the given member (or none). */
function deps(member: MemberRow | null): AuthDeps {
  return {
    verifyToken: async (jwt) => (jwt === 'valid' ? { userId: member?.id ?? 'unknown' } : null),
    getMember: async () => member,
  }
}

function buildApp(authDeps: AuthDeps) {
  const app = express()
  app.use(express.json())

  // A stand-in admin-only route (real admin routes arrive in the Admin chunk).
  const adminRouter = Router()
  adminRouter.get('/admin/ping', (_req, res) => {
    res.json({ ok: true })
  })

  mountProtected(app, '/api', meRouter, { deps: authDeps })
  mountProtected(app, '/api', adminRouter, { admin: true, deps: authDeps })
  app.use(errorHandler)
  return app
}

describe('GET /api/me (requireAuth)', () => {
  it('401s with no token', async () => {
    const res = await request(buildApp(deps(memberRow))).get('/api/me')
    expect(res.status).toBe(401)
  })

  it('401s with an invalid token', async () => {
    const res = await request(buildApp(deps(memberRow)))
      .get('/api/me')
      .set('Authorization', 'Bearer nope')
    expect(res.status).toBe(401)
  })

  it('returns 200 and the CurrentUser JSON for a valid member token', async () => {
    const res = await request(buildApp(deps(memberRow)))
      .get('/api/me')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: 'user-1',
      displayName: 'Bára Nováková',
      email: 'bara@pes.dev',
      avatarUrl: null,
      role: 'member',
      division: 'A',
      coefficient: 1.25,
      languagePref: 'cs',
      themePref: 'light',
    })
  })

  it('403s (not_a_member) for a valid token with no member row', async () => {
    const res = await request(buildApp(deps(null)))
      .get('/api/me')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'not_a_member' })
  })
})

describe('admin-only route (requireAdmin)', () => {
  it('403s a member token', async () => {
    const res = await request(buildApp(deps(memberRow)))
      .get('/api/admin/ping')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'forbidden' })
  })

  it('allows an admin token', async () => {
    const res = await request(buildApp(deps(adminRow)))
      .get('/api/admin/ping')
      .set('Authorization', 'Bearer valid')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})
