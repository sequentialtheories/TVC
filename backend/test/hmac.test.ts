import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import { sessionMiddleware } from '../src/middleware/session'
import { hmacRequiredForMutations } from '../src/middleware/hmac'
import proxyRoutes from '../src/routes/proxy'
import { signSession } from '../src/utils/jwt'
import nock from 'nock'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      stApiAuthBase: 'https://example.supabase.co/functions/v1',
      vaultClubApiKey: 'test-key',
      hmacRequired: true,
      hmacSecret: 'secret'
    }
  }
})

describe('HMAC middleware on mutators', () => {
  let server: http.Server

  beforeAll(async () => {
    const app = express()
    app.use(cors({ origin: '*', credentials: true }))
    app.use(express.json())
    app.use(cookieParser())
    app.use(sessionMiddleware)
    app.use(hmacRequiredForMutations)
    app.use('/', proxyRoutes)
    server = app.listen(0)
  })

  afterAll(async () => {
    await new Promise((r) => server.close(() => r(null)))
    nock.cleanAll()
  })

  it('blocks missing signature', async () => {
    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: null, stAccessToken: 'st-abc' })
    const res = await request(server).post('/vault/deposit').set('Cookie', [`tvc_session=${token}`]).send({ amount: '1' })
    expect(res.status).toBe(400)
  })

  it('accepts valid signature and proxies', async () => {
    const payload = { amount: '1' }
    nock('https://example.supabase.co')
      .post('/functions/v1/vault-deposit', payload)
      .matchHeader('x-vault-club-api-key', 'test-key')
      .reply(200, { success: true })

    const sig = crypto.createHmac('sha256', 'secret').update(JSON.stringify(payload)).digest('hex')
    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: null, stAccessToken: 'st-abc' })
    const res = await request(server)
      .post('/vault/deposit')
      .set('Cookie', [`tvc_session=${token}`])
      .set('x-signature', sig)
      .send(payload)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
