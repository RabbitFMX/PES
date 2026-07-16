import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mountProtected, type AuthDeps } from '../middleware/auth'
import { errorHandler } from '../middleware/errorHandler'
import { meRouter } from './me'
import type { MemberRow } from '../db/types'

const updateMemberProfile = vi.hoisted(() => vi.fn())
vi.mock('../db/members', () => ({ updateMemberProfile }))

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
  verifyToken: async (jwt) => (jwt === 'valid' ? { userId: 'me' } : null),
  getMember: async () => member(),
}

function buildApp() {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', meRouter, { deps })
  app.use(errorHandler)
  return app
}

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/me', () => {
  it('updates the member profile and returns the CurrentUser shape', async () => {
    updateMemberProfile.mockResolvedValue(
      member({ name: 'Rex', avatar_url: 'dog:shiba:tan:md', theme_pref: 'dark' }),
    )
    const res = await request(buildApp())
      .patch('/api/me')
      .set('Authorization', 'Bearer valid')
      .send({ displayName: 'Rex', avatarUrl: 'dog:shiba:tan:md', themePref: 'dark' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      displayName: 'Rex',
      avatarUrl: 'dog:shiba:tan:md',
      themePref: 'dark',
    })
    expect(updateMemberProfile).toHaveBeenCalledWith('me', {
      name: 'Rex',
      avatar_url: 'dog:shiba:tan:md',
      theme_pref: 'dark',
    })
  })

  it('401s without a token', async () => {
    expect((await request(buildApp()).patch('/api/me').send({ displayName: 'x' })).status).toBe(401)
  })

  it('400s an invalid body (empty display name)', async () => {
    const res = await request(buildApp())
      .patch('/api/me')
      .set('Authorization', 'Bearer valid')
      .send({ displayName: '' })
    expect(res.status).toBe(400)
    expect(updateMemberProfile).not.toHaveBeenCalled()
  })
})
