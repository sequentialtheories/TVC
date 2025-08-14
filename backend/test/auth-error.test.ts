import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import http from 'http'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import authRoutes from '../src/routes/auth'

vi.mock('../src/services/stClient', () => {
  return {
    validateStAccessToken: () => { throw new Error('boom') },
    authenticateWithEmailPassword: () => { throw new Error('boom') }
  }
})

describe('Auth error branch', () => {
  let server: http.Server

  beforeAll(() => {
    const app = express()
    app.use(cors({ origin: '*', credentials: true }))
    app.use(express.json())
    app.use(cookieParser())
    app.use('/auth', authRoutes)
    server = app.listen(0)
  })

  afterAll(async () => {
    await new Promise((r) => server.close(() => r(null)))
  })

  it('returns 500 if underlying auth throws', async () => {
    const res = await request(server).post('/auth/login').send({ stAccessToken: 'tok' })
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
  })
})
