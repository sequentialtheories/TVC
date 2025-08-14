import { describe, it, expect, vi, afterAll, beforeAll } from 'vitest'
import request from 'supertest'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { sessionMiddleware } from '../src/middleware/session'
import proxyRoutes from '../src/routes/proxy'
import nock from 'nock'
import { signSession } from '../src/utils/jwt'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      stApiAuthBase: 'https://example.supabase.co/functions/v1',
      vaultClubApiKey: 'test-key',
      hmacRequired: false
    }
  }
})

describe('Proxy error handling', () => {
  let server: http.Server

  beforeAll(() => {
    const app = express()
    app.use(cors({ origin: '*', credentials: true }))
    app.use(express.json())
    app.use(cookieParser())
    app.use(sessionMiddleware)
    app.use('/', proxyRoutes)
    server = app.listen(0)
  })

  afterAll(async () => {
    await new Promise((r) => server.close(() => r(null)))
    nock.cleanAll()
  })

  it('propagates 401 from upstream', async () => {
    nock('https://example.supabase.co')
      .post('/functions/v1/vault-deposit', { amount: '1' })
      .reply(401, { success: false, error: 'Unauthorized' })

    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: null, stAccessToken: 'st-bad' })
    const res = await request(server)
      .post('/vault/deposit')
      .set('Cookie', [`tvc_session=${token}`])
      .send({ amount: '1' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })

  it('propagates 429 from upstream', async () => {
    nock('https://example.supabase.co')
      .post('/functions/v1/vault-deposit', { amount: '1' })
      .reply(429, { success: false, error: 'Too Many Requests' })

    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: null, stAccessToken: 'st-abc' })
    const res = await request(server)
      .post('/vault/deposit')
      .set('Cookie', [`tvc_session=${token}`])
      .send({ amount: '1' })

    expect(res.status).toBe(429)
    expect(res.body.success).toBe(false)
  })
})
