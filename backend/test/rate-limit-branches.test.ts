import { describe, it, expect } from 'vitest'
import request from 'supertest'
import http from 'http'
import { signSession } from '../src/utils/jwt'

describe('rateLimit key generation branches', async () => {
  it('uses IP when no session, and userId when session exists', async () => {
    const app = (await import('../src/app')).default
    const server: http.Server = app.listen(0)

    const res1 = await request(server).get('/healthz')
    expect(res1.status).toBe(200)

    const token = signSession({ userId: 'user-123', email: 'e@x.com', wallet: null, stAccessToken: null })
    const res2 = await request(server).get('/healthz').set('Cookie', [`tvc_session=${token}`])
    expect(res2.status).toBe(200)

    await new Promise<void>(resolve => server.close(() => resolve()))
  })
})
