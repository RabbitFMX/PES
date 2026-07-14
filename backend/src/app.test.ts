import { afterEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import { createApp } from './app'

describe('createApp CORS', () => {
  const originalOrigin = process.env.CORS_ORIGIN

  afterEach(() => {
    if (originalOrigin === undefined) {
      delete process.env.CORS_ORIGIN
    } else {
      process.env.CORS_ORIGIN = originalOrigin
    }
  })

  it('allows the Vite dev origin by default', async () => {
    delete process.env.CORS_ORIGIN
    const res = await request(createApp()).get('/api/health').set('Origin', 'http://localhost:5173')

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('honours a configured CORS_ORIGIN', async () => {
    process.env.CORS_ORIGIN = 'https://pes.example.com'
    const res = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://pes.example.com')

    expect(res.headers['access-control-allow-origin']).toBe('https://pes.example.com')
  })
})
