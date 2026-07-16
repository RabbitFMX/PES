import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import { signupRouter } from './signup'
import { errorHandler } from '../middleware/errorHandler'

// Mock the DB layer so the tests drive the endpoint without a live Supabase.
const getMemberByEmail = vi.hoisted(() => vi.fn())
const insertMember = vi.hoisted(() => vi.fn())
const signUpAuthUser = vi.hoisted(() => vi.fn())

vi.mock('../db/members', () => ({ getMemberByEmail, insertMember, signUpAuthUser }))

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api', signupRouter)
  app.use(errorHandler)
  return app
}

const CODE = 'PACK-2026'
const good = { name: 'New Dog', email: 'new@pes.dev', password: 'sup3rsecret', inviteCode: CODE }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.SIGNUP_INVITE_CODE = CODE
})

afterEach(() => {
  delete process.env.SIGNUP_INVITE_CODE
})

describe('POST /api/signup', () => {
  it('creates an account with a valid invite code (201)', async () => {
    getMemberByEmail.mockResolvedValue(null)
    signUpAuthUser.mockResolvedValue({ userId: 'new-uuid' })
    insertMember.mockResolvedValue(undefined)

    const res = await request(buildApp()).post('/api/signup').send(good)

    expect(res.status).toBe(201)
    expect(res.body).toEqual({ ok: true })
    expect(signUpAuthUser).toHaveBeenCalledWith('new@pes.dev', 'sup3rsecret')
    expect(insertMember.mock.calls[0][0]).toMatchObject({
      id: 'new-uuid',
      email: 'new@pes.dev',
      name: 'New Dog',
      role: 'member',
      division: 'B',
    })
  })

  it('rejects a wrong invite code without creating anything', async () => {
    const res = await request(buildApp())
      .post('/api/signup')
      .send({ ...good, inviteCode: 'nope' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toMatch(/invite code/i)
    expect(signUpAuthUser).not.toHaveBeenCalled()
    expect(insertMember).not.toHaveBeenCalled()
  })

  it('is disabled (fails closed) when SIGNUP_INVITE_CODE is unset', async () => {
    delete process.env.SIGNUP_INVITE_CODE
    const res = await request(buildApp()).post('/api/signup').send(good)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toMatch(/disabled/i)
    expect(signUpAuthUser).not.toHaveBeenCalled()
  })

  it('rejects a duplicate email', async () => {
    getMemberByEmail.mockResolvedValue({ id: 'exists' })
    const res = await request(buildApp()).post('/api/signup').send(good)

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(res.body.message).toMatch(/already exists/i)
    expect(signUpAuthUser).not.toHaveBeenCalled()
  })

  it('rejects an invalid body (bad email / short password) with a message', async () => {
    const res = await request(buildApp())
      .post('/api/signup')
      .send({ name: 'X', email: 'not-an-email', password: 'short', inviteCode: CODE })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(false)
    expect(signUpAuthUser).not.toHaveBeenCalled()
  })
})
