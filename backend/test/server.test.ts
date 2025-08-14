import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import http from 'http'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      FRONTEND_ORIGIN: '*',
    }
  }
})

describe('App wiring and health', () => {
  it('responds to /healthz and uses env network/chainId', async () => {
    const app = (await import('../src/app')).default
    const server: http.Server = app.listen(0)
    const res = await request(server).get('/healthz')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('ok', true)
    expect(res.body).toHaveProperty('network')
    expect(res.body).toHaveProperty('chainId')
    await new Promise<void>(resolve => server.close(() => resolve()))
  })
})
