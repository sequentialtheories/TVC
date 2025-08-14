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
    validateStAccessToken: vi.fn(async () => ({ success: false })),
    authenticateWithEmailPassword: vi.fn(async (_email: string, _password: string) => ({
      success: true,
      data: {
        user: { id: 'user-2', email: 'e@example.com' },
        wallet: { address: '0xabc', network: 'amoy' },
        session: { access_token: 'st-fallback' }
      }
    }))
  }
})

describe('Auth login - fallback email/password', () => {
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

  it('accepts email/password and sets cookie', async () => {
    const res = await request(server).post('/auth/login').send({ email: 'e@example.com', password: 'pw' })
    expect(res.status).toBe(200)
    expect(res.body.data.user.id).toBe('user-2')
    expect(res.headers['set-cookie']?.[0]).toMatch(/tvc_session=/)
  })
})
