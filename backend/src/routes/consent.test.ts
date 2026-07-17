import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { optionalAuth, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { consentRouter } from './consent'
import type { MemberRow } from '../db/types'

const recordConsent = vi.hoisted(() => vi.fn())
vi.mock('../services/consent', () => ({ recordConsent }))

function member(over: Partial<MemberRow> = {}): MemberRow {
  return {
    id: 'me',
    name: 'Me',
    email: 'me@pes.dev',
    gender: null,
    coefficient: 1,
    division: 'A',
    role: 'member',
    status: 'active',
    joined_date: '2020-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
    ...over,
  }
}

const deps: AuthDeps = {
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: 'me' } : null),
  getMember: async () => member(),
}

function buildApp() {
  const app = express()
  app.set('trust proxy', true)
  app.use(express.json())
  app.use('/api', optionalAuth(deps), consentRouter)
  app.use(errorHandler)
  return app
}

const good = {
  consents: { analytics: true, marketing: false },
  policyVersion: '1',
  policyHash: 'h',
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/consent', () => {
  it('records a decision anonymously (no token) with member_id null', async () => {
    const res = await request(buildApp()).post('/api/consent').send(good)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(recordConsent).toHaveBeenCalledTimes(1)
    const [body, ctx] = recordConsent.mock.calls[0]
    expect(body).toMatchObject(good)
    expect(ctx.memberId).toBeNull()
  })

  it('attaches the member when a valid token is present', async () => {
    const res = await request(buildApp())
      .post('/api/consent')
      .set('Authorization', 'Bearer valid')
      .send(good)

    expect(res.status).toBe(201)
    expect(recordConsent.mock.calls[0][1].memberId).toBe('me')
  })

  it('stays anonymous when the token is invalid (never 401s)', async () => {
    const res = await request(buildApp())
      .post('/api/consent')
      .set('Authorization', 'Bearer nope')
      .send(good)

    expect(res.status).toBe(201)
    expect(recordConsent.mock.calls[0][1].memberId).toBeNull()
  })

  it('400s an empty decision (no category provided)', async () => {
    const res = await request(buildApp())
      .post('/api/consent')
      .send({ consents: {}, policyVersion: '1', policyHash: 'h' })

    expect(res.status).toBe(400)
    expect(recordConsent).not.toHaveBeenCalled()
  })

  it('400s a missing policy version/hash', async () => {
    const res = await request(buildApp())
      .post('/api/consent')
      .send({ consents: { analytics: true } })

    expect(res.status).toBe(400)
    expect(recordConsent).not.toHaveBeenCalled()
  })
})
