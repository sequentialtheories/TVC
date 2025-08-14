import { describe, it, expect, vi, afterAll } from 'vitest'
import request from 'supertest'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { sessionMiddleware } from '../src/middleware/session'
import { hmacRequiredForMutations } from '../src/middleware/hmac'
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

describe('HMAC branches', () => {
  let server: http.Server

  afterAll(async () => {
    await new Promise((r) => server?.close(() => r(null)))
    nock.cleanAll()
  })

  it('skips HMAC when disabled and allows GET through', async () => {
    const app = express()
    app.use(cors({ origin: '*', credentials: true }))
    app.use(express.json())
    app.use(cookieParser())
    app.use(sessionMiddleware)
    app.use(hmacRequiredForMutations)
    app.use('/', proxyRoutes)

    nock('https://example.supabase.co')
      .get('/functions/v1/vault-balance')
      .matchHeader('x-vault-club-api-key', 'test-key')
      .reply(200, { success: true })

    server = app.listen(0)

    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: null, stAccessToken: 'st-abc' })
    const res = await request(server).get('/vault/wbtc-balance').set('Cookie', [`tvc_session=${token}`])
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
