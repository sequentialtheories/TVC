import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { sessionMiddleware } from '../src/middleware/session'
import authRoutes from '../src/routes/auth'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      hmacRequired: false
    }
  }
})

vi.mock('../src/services/stClient', () => {
  return {
    validateStAccessToken: vi.fn(async (_token: string) => ({
      success: true,
      data: {
        user: { id: 'user-1', email: 'u@example.com' },
        wallet: { address: '0x123', network: 'amoy' },
        session: { access_token: 'st-xyz' }
      }
    })),
    authenticateWithEmailPassword: vi.fn()
  }
})

describe('Auth login - token-first', () => {
  let server: http.Server

  beforeAll(async () => {
    const app = express()
    app.use(cors({ origin: '*', credentials: true }))
    app.use(express.json())
    app.use(cookieParser())
    app.use(sessionMiddleware)
    app.use('/auth', authRoutes)
    server = app.listen(0)
  })

  afterAll(async () => {
    await new Promise((r) => server.close(() => r(null)))
  })

  it('accepts stAccessToken and sets session cookie + returns user/wallet', async () => {
    const res = await request(server).post('/auth/login').send({ stAccessToken: 'st-xyz' })
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.id).toBe('user-1')
    expect(res.headers['set-cookie']?.[0]).toMatch(/tvc_session=/)

    const me = await request(server).get('/auth/me').set('Cookie', res.headers['set-cookie'])
    expect(me.status).toBe(200)
    expect(me.body.data.user.id).toBe('user-1')
    expect(me.body.data.wallet.address).toBe('0x123')
  })
})
