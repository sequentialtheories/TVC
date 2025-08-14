import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { sessionMiddleware } from '../src/middleware/session'
import authRoutes from '../src/routes/auth'
import { signSession } from '../src/utils/jwt'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      hmacRequired: false
    }
  }
})

describe('me/logout', () => {
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

  it('me requires session; after logout it clears', async () => {
    const token = signSession({ userId: 'u1', email: 'e@x.com', wallet: { address: '0xabc', network: 'polygon' }, stAccessToken: null })
    const res1 = await request(server).get('/auth/me').set('Cookie', [`tvc_session=${token}`])
    expect(res1.status).toBe(200)
    expect(res1.body?.data?.user?.id).toBe('u1')

    const res2 = await request(server).post('/auth/logout').set('Cookie', [`tvc_session=${token}`])
    expect(res2.status).toBe(200)

    const res3 = await request(server).get('/auth/me')
    expect(res3.status).toBe(401)
  })
})
