import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
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
      hmacRequired: true,
      hmacSecret: 'secret'
    }
  }
})

describe('HMAC invalid signature branch', () => {
  let server: http.Server

  beforeAll(() => {
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

  it('rejects when signature is provided but invalid', async () => {
    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: null, stAccessToken: 'st-abc' })
    const res = await request(server)
      .post('/vault/deposit')
      .set('Cookie', [`tvc_session=${token}`])
      .set('x-signature', 'deadbeef')
      .send({ amount: '1' })

    expect(res.status).toBe(401)
    expect(res.body.success).toBe(false)
  })
})
