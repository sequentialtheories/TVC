import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'

vi.mock('node-fetch', async () => {
  const mod = await import('node-fetch')
  return {
    ...mod,
    default: vi.fn(async (url: string, init?: any) => {
      const body = init?.body ? JSON.parse(init.body) : {}
      const email: string = body.email || 'x@x.com'
      const map: Record<string, { id: string; addr: string; name: string }> = {
        'x@x.com': { id: 'u1', addr: '0x1111', name: 'User One' },
        'y@y.com': { id: 'u2', addr: '0x2222', name: 'User Two' },
        'z@z.com': { id: 'u3', addr: '0x3333', name: 'User Three' }
      }
      const u = map[email] || map['x@x.com']
      return {
        json: async () => ({
          success: true,
          data: {
            user: { id: u.id, email, name: u.name },
            wallet: { address: u.addr }
          }
        })
      } as any
    })
  }
})

process.env.NODE_ENV = 'test'
process.env.TVC_JWT_SECRET = 'test-secret'
process.env.POLYGON_CHAIN_ID = '80002'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.ALLOW_UNSIGNED_MUTATIONS = '1'
process.env.ST_AUTH_URL = 'https://example.com/fn'
process.env.ST_VAULT_CLUB_API_KEY = 'k'

import { app } from '../src/index.js'
import { db } from '../src/storage.js'

function csrfHeaders() {
  return { 'x-csrf-token': 't', cookie: 'csrfToken=t' }
}

describe('auth.login.succeedsWithValidSTToken', () => {
  beforeEach(() => {
    db.users.clear()
    db.wallets.clear()
  })

  it('returns jwt, user, wallet', async () => {
    const res = await request(app)
      .post('/auth/login')
      .set(csrfHeaders())
      .send({ email: 'x@x.com', password: 'p' })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.tvcJwt).toBeTruthy()
    expect(res.body.data.wallet.address).toBe('0x1111')
  })
})

describe('wallet.me returns bound wallet', () => {
  it('returns the ST-bound wallet after login', async () => {
    const login = await request(app)
      .post('/auth/login')
      .set(csrfHeaders())
      .send({ email: 'x@x.com', password: 'p' })
      .expect(200)

    const token = login.body.data.tvcJwt as string
    const me = await request(app)
      .get('/wallet/me')
      .set('authorization', `Bearer ${token}`)
      .expect(200)

    expect(me.body.data.address).toBe('0x1111')
    expect(me.body.data.chainId).toBe(80002)
  })
})
