import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import http from 'http'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      hmacRequired: false
    }
  }
})

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { sessionMiddleware } from '../src/middleware/session'
import authRoutes from '../src/routes/auth'

describe('Auth routes', () => {
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

  it('rejects when no credentials provided', async () => {
    const res = await request(server).post('/auth/login').send({})
    expect(res.status).toBe(401)
  })
})
