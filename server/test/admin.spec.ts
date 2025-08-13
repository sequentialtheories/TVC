import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'
import { app } from '../src/index.js'
import { db } from '../src/storage.js'

vi.mock('node-fetch', async () => {
  const mod = await import('node-fetch')
  return {
    ...mod,
    default: vi.fn(async (url: string, init?: any) => ({
      json: async () => ({
        success: true,
        data: { user: { id: 'adm', email: 'admin@tvc', name: 'Admin' }, wallet: { address: '0xadmin' } }
      })
    })) as any
  }
})

process.env.NODE_ENV = 'test'
process.env.TVC_JWT_SECRET = 'test-secret'
process.env.POLYGON_CHAIN_ID = '80002'
process.env.CORS_ORIGIN = 'http://localhost:5173'
process.env.ALLOW_UNSIGNED_MUTATIONS = '1'
process.env.ST_AUTH_URL = 'https://example.com/fn'
process.env.ST_VAULT_CLUB_API_KEY = 'k'

function csrfHeaders() {
  return { 'x-csrf-token': 't', cookie: 'csrfToken=t' }
}

async function login() {
  const r = await request(app).post('/auth/login').set(csrfHeaders()).send({ email: 'admin@tvc', password: 'p' })
  return r.body.data.tvcJwt as string
}

beforeEach(() => {
  db.users.clear()
  db.wallets.clear()
  db.subclubs.clear()
  db.memberships.clear()
  db.deposits.clear()
  db.epochs.clear()
  db.penalties.clear()
  db.wbtc.clear()
  db.ops.paused = false
  db.ops.circuitBreaker = false
})

describe('admin.endpoints', () => {
  it('admin/warp warps N weeks and admin/epochs lists recent', async () => {
    const token = await login()
    const init = await request(app)
      .post('/vault/init-subclub')
      .set('authorization', `Bearer ${token}`)
      .set(csrfHeaders())
      .send({ name: 'Alpha', lockupWeeks: 520, rigor: 'medium', private: true })
      .expect(200)

    const subclubId = init.body.data.subclubId as string

    const warp = await request(app)
      .post('/admin/warp')
      .set('authorization', `Bearer ${token}`)
      .send({ subclubId, weeks: 5 })
      .expect(200)

    expect(warp.body.data.warped).toBe(5)

    const epochs = await request(app)
      .get('/admin/epochs')
      .set('authorization', `Bearer ${token}`)
      .expect(200)

    expect(Array.isArray(epochs.body.data.items)).toBe(true)
  })
})
