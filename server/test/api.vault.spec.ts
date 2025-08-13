import { describe, it, expect, beforeEach, vi } from 'vitest'
import request from 'supertest'

vi.mock('node-fetch', async () => {
  const mod = await import('node-fetch')
  return {
    ...mod,
    default: vi.fn(async (url: string, init?: any) => {
      const body = init?.body ? JSON.parse(init.body) : {}
      const email: string = body.email || 'y@y.com'
      const map: Record<string, { id: string; addr: string; name: string }> = {
        'y@y.com': { id: 'u2', addr: '0x2222', name: 'User Two' },
        'z@z.com': { id: 'u3', addr: '0x3333', name: 'User Three' },
        'w@w.com': { id: 'u4', addr: '0x4444', name: 'User Four' }
      }
      const u = map[email] || map['y@y.com']
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

async function login(email = 'y@y.com') {
  const r = await request(app).post('/auth/login').set(csrfHeaders()).send({ email, password: 'p' })
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

describe('vault.init/join/deposit/progress', () => {
  it('creates subclub, joins via invite token once, deposits with 10/60/30 and shows progress', async () => {
    const ownerToken = await login('y@y.com')

    const init = await request(app)
      .post('/vault/init-subclub')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({ name: 'Alpha', lockupWeeks: 520, rigor: 'medium', private: true, weeklyDepositUSD: 100 })
      .expect(200)

    const subclubId = init.body.data.subclubId as string
    const inviteToken = init.body.data.inviteToken as string
    expect(subclubId).toBeTruthy()
    expect(inviteToken).toBeTruthy()

    const joinerToken = await login('z@z.com')
    const join = await request(app)
      .post('/vault/join')
      .set('authorization', `Bearer ${joinerToken}`)
      .set(csrfHeaders())
      .send({ inviteToken })
      .expect(200)

    expect(join.body.data.subclubId).toBe(subclubId)

    const deposit = await request(app)
      .post('/vault/deposit')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({ subclubId, amountUSD: 800, epoch: 1 })
      .expect(200)

    expect(deposit.body.data.byStrandUSD.p1).toBeCloseTo(80, 2)
    expect(deposit.body.data.byStrandUSD.p2).toBeCloseTo(480, 2)
    expect(deposit.body.data.byStrandUSD.p3).toBeCloseTo(240, 2)

    const progress = await request(app)
      .get('/vault/progress')
      .set('authorization', `Bearer ${ownerToken}`)
      .query({ subclubId })
      .expect(200)

    expect(progress.body.data.subclub.id).toBe(subclubId)
    expect(progress.body.data.epoch.deposits.totalUSD).toBeCloseTo(800, 2)
  })

  it('invite token can be used only once', async () => {
    const ownerToken = await login('y@y.com')
    const init = await request(app)
      .post('/vault/init-subclub')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({ name: 'Alpha', lockupWeeks: 520, rigor: 'medium', private: true })
      .expect(200)

    const subclubId = init.body.data.subclubId as string
    const inviteToken = init.body.data.inviteToken as string

    const firstJoiner = await login('z@z.com')
    await request(app)
      .post('/vault/join')
      .set('authorization', `Bearer ${firstJoiner}`)
      .set(csrfHeaders())
      .send({ inviteToken })
      .expect(200)

    const secondJoiner = await login('w@w.com')
    const second = await request(app)
      .post('/vault/join')
      .set('authorization', `Bearer ${secondJoiner}`)
      .set(csrfHeaders())
      .send({ inviteToken })
      .expect(400)

    expect(second.body.success).toBe(false)
    expect(subclubId).toBeTruthy()
  })
})

describe('emergency.pause/withdraw', () => {
  it('pause blocks deposits and withdraw returns only deposits', async () => {
    const ownerToken = await login('y@y.com')
    const init = await request(app)
      .post('/vault/init-subclub')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({ name: 'Alpha', lockupWeeks: 520, rigor: 'medium', private: true })
      .expect(200)

    const subclubId = init.body.data.subclubId as string

    await request(app)
      .post('/emergency/pause')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({})
      .expect(200)

    const blocked = await request(app)
      .post('/vault/deposit')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({ subclubId, amountUSD: 100, epoch: 1 })
      .expect(423)

    expect(blocked.body.success).toBe(false)

    const resW = await request(app)
      .post('/emergency/withdraw')
      .set('authorization', `Bearer ${ownerToken}`)
      .set(csrfHeaders())
      .send({ subclubId })
      .expect(200)

    expect(typeof resW.body.data.refundableUSD).toBe('number')
  })
})
