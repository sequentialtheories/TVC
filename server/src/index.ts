import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import { AuthedRequest, requireAuth } from './middleware/auth.js'
import { requireSignature } from './middleware/signing.js'
import { ApiResponse, Epoch, Subclub } from './types.js'
import { db, getWeekNow, makeHash, makeId } from './storage.js'
import { runEpoch, warpWeeks } from './sim.js'

const app = express()
app.use(express.json())
app.use(helmet())
app.use(compression())
app.use(cors({ origin: process.env.CORS_ORIGIN || false }))

function ok<T>(data: T): ApiResponse<T> { return { success: true, data } }
function err(code: string, message: string): ApiResponse<never> { return { success: false, error: { code, message } } }

const RATE = { windowMs: 60_000, limit: 60, mutLimit: 10 }
const buckets = new Map<string, { count: number; reset: number }>()
function limited(key: string, mut: boolean = false): boolean {
  const now = Date.now()
  const cap = mut ? RATE.mutLimit : RATE.limit
  const b = buckets.get(key)
  if (!b || now > b.reset) { buckets.set(key, { count: 1, reset: now + RATE.windowMs }); return false }
  if (b.count >= cap) return true
  b.count++
  return false
}

app.post('/auth/login', async (req, res) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown'
    if (limited(`ip:${ip}`, true)) return res.status(429).json(err('rate_limited', 'Too many requests'))
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json(err('bad_request', 'Email and password required'))
    const url = process.env.ST_AUTH_URL || ''
    const key = process.env.ST_VAULT_CLUB_API_KEY || ''
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vault-club-api-key': key },
      body: JSON.stringify({ email, password })
    })
    const j = await r.json() as any
    if (!j?.success) return res.status(401).json(err('st_auth_failed', 'Invalid credentials'))
    const user = j.data.user
    const wallet = j.data.wallet
    if (!wallet?.address) return res.status(400).json(err('wallet_missing', 'No wallet found'))
    if ((process.env.POLYGON_CHAIN_ID || '') !== '80002') return res.status(400).json(err('testnet_only', 'Chain must be Amoy 80002'))
    db.users.set(user.id, { id: user.id, email: user.email, displayName: user.name })
    db.wallets.set(user.id, { address: wallet.address, chainId: 80002 })
    const tvcJwt = jwt.sign({ userId: user.id }, process.env.TVC_JWT_SECRET || 'set', { expiresIn: '2h' })
    const resp = ok({
      tvcJwt,
      user: { id: user.id, email: user.email, displayName: user.name },
      wallet: { address: wallet.address, chainId: 80002 },
      permissions: ['deposit', 'emergency_withdraw'] as ('deposit' | 'emergency_withdraw')[]
    })
    return res.json(resp)
  } catch (e: any) {
    return res.status(500).json(err('server_error', e?.message || 'Error'))
  }
})

app.get('/wallet/me', requireAuth, (req: AuthedRequest, res) => {
  const w = db.wallets.get(req.userId!)
  if (!w) return res.status(404).json(err('wallet_not_found', 'No wallet'))
  return res.json(ok({ address: w.address, chainId: w.chainId }))
})

app.post('/vault/init-subclub', requireAuth, requireSignature, (req: AuthedRequest, res) => {
  const { name, lockupWeeks, rigor, private: isPrivate, chargedContract, maxMembers, weeklyDepositUSD } = req.body || {}
  if (!name || !lockupWeeks || !rigor) return res.status(400).json(err('bad_request', 'Missing fields'))
  const id = makeId('subclub')
  const inviteToken = makeId('invite')
  const sub: Subclub = {
    id,
    ownerUserId: req.userId!,
    name,
    lockupWeeks,
    rigor,
    status: 'active',
    private: !!isPrivate,
    chargedContract: !!chargedContract,
    maxMembers: maxMembers || 4,
    startWeek: getWeekNow(),
    phase2Trigger: { byTime: false, byTVL: false },
    inviteTokenHash: makeHash(inviteToken),
    inviteTokenExpiresAt: Date.now() + 1000 * 60 * 30
  }
  db.subclubs.set(id, sub)
  const mKey = `${id}:${req.userId!}`
  db.memberships.set(mKey, { subclubId: id, userId: req.userId!, shareWeight: 1, missedDeposits: 0, depositsTotalUSD: 0 })
  return res.json(ok({ subclubId: id, inviteToken }))
})

app.post('/vault/join', requireAuth, requireSignature, (req: AuthedRequest, res) => {
  const { inviteToken } = req.body || {}
  if (!inviteToken) return res.status(400).json(err('bad_request', 'Missing inviteToken'))
  const h = makeHash(inviteToken)
  const sub = Array.from(db.subclubs.values()).find(s => s.inviteTokenHash === h)
  if (!sub) return res.status(404).json(err('invalid_invite', 'Invite not found'))
  if (sub.inviteTokenExpiresAt && Date.now() > sub.inviteTokenExpiresAt) return res.status(400).json(err('invite_expired', 'Invite expired'))
  if (!sub.private) return res.status(400).json(err('invalid_invite', 'Not required'))
  const mKey = `${sub.id}:${req.userId!}`
  if (db.memberships.has(mKey)) return res.status(400).json(err('already_member', 'Already joined'))
  sub.inviteTokenHash = null
  db.subclubs.set(sub.id, sub)
  db.memberships.set(mKey, { subclubId: sub.id, userId: req.userId!, shareWeight: 1, missedDeposits: 0, depositsTotalUSD: 0 })
  return res.json(ok({ subclubId: sub.id }))
})

app.post('/vault/deposit', requireAuth, requireSignature, (req: AuthedRequest, res) => {
  const { subclubId, amountUSD, epoch } = req.body || {}
  if (!subclubId || typeof amountUSD !== 'number') return res.status(400).json(err('bad_request', 'Missing fields'))
  const sub = db.subclubs.get(subclubId)
  if (!sub) return res.status(404).json(err('not_found', 'Subclub'))
  if (sub.status !== 'active' && sub.status !== 'phase2') return res.status(400).json(err('invalid_state', 'Not active'))
  const week = typeof epoch === 'number' ? epoch : getWeekNow()
  const mKey = `${subclubId}:${req.userId!}`
  const mem = db.memberships.get(mKey)
  if (!mem) return res.status(403).json(err('not_member', 'Join first'))
  const depId = makeId('dep')
  db.deposits.set(depId, { id: depId, subclubId, userId: req.userId!, week, amountUSD, createdAt: Date.now() })
  mem.depositsTotalUSD += amountUSD
  db.memberships.set(mKey, mem)
  const D1 = amountUSD * 0.10
  const D2 = amountUSD * 0.60
  const D3 = amountUSD * 0.30
  const eKey = `${subclubId}:${week}`
  const prev = db.epochs.get(eKey) || { subclubId, week, p1USD: 0, p2USD: 0, p3USD: 0, profitP1: 0, profitP2: 0, profitP3: 0, tvlUSD: 0, phase2Active: sub.status === 'phase2', dcaUSD: 0, btcPrice: 0 } as Epoch
  prev.p1USD += D1
  prev.p2USD += D2
  prev.p3USD += D3
  prev.tvlUSD += amountUSD
  db.epochs.set(eKey, prev)
  return res.json(ok({ depositedUSD: amountUSD, byStrandUSD: { p1: D1, p2: D2, p3: D3 }, week }))
})

app.get('/vault/progress', requireAuth, (req: AuthedRequest, res) => {
  const subclubId = String(req.query.subclubId || '')
  const sub = db.subclubs.get(subclubId)
  if (!sub) return res.status(404).json(err('not_found', 'Subclub'))
  const weeks = Array.from(db.epochs.values()).filter(e => e.subclubId === subclubId).map(e => e.week)
  const currentWeek = weeks.length ? Math.max(...weeks) : getWeekNow()
  const members = Array.from(db.memberships.values()).filter(m => m.subclubId === subclubId).map(m => ({
    userId: m.userId, shareWeight: m.shareWeight, missed: m.missedDeposits, depositedUSD: m.depositsTotalUSD
  }))
  const eKey = `${subclubId}:${currentWeek}`
  const epoch = db.epochs.get(eKey) || { subclubId, week: currentWeek, p1USD: 0, p2USD: 0, p3USD: 0, profitP1: 0, profitP2: 0, profitP3: 0, tvlUSD: 0, phase2Active: false, dcaUSD: 0, btcPrice: 0 }
  const tvlUSD = Array.from(db.epochs.values()).filter(e => e.subclubId === subclubId).reduce((a, b) => a + b.p1USD + b.p2USD + b.p3USD, 0)
  return res.json(ok({
    subclub: {
      id: sub.id,
      status: sub.status,
      rigor: sub.rigor,
      lockupWeeks: sub.lockupWeeks,
      currentWeek,
      members
    },
    epoch: {
      week: epoch.week,
      deposits: { totalUSD: (epoch.p1USD + epoch.p2USD + epoch.p3USD), byStrandUSD: { p1: epoch.p1USD, p2: epoch.p2USD, p3: epoch.p3USD } },
      profitsUSD: { p1: epoch.profitP1, p2: epoch.profitP2, p3: epoch.profitP3 },
      postRRLUSD: { p1: epoch.p1USD, p2: epoch.p2USD, p3: epoch.p3USD },
      userBalancesUSD: members.map(m => ({ userId: m.userId, balance: m.depositedUSD })),
      penalties: Array.from(db.penalties.values()).filter(p => p.subclubId === subclubId && p.week === currentWeek).map(p => ({ userId: p.userId, deltaShare: p.deltaShare, reason: p.reason }))
    },
    phase2: {
      active: sub.status === 'phase2',
      dcaUSDThisWeek: epoch.dcaUSD,
      wbtcAccumulated: Array.from(db.wbtc.values()).filter(w => w.subclubId === subclubId).reduce((a, b) => a + b.wbtcQty, 0),
      btcPrice: epoch.btcPrice
    },
    tvlUSD
  }))
})

app.get('/vault/wbtc-balance', requireAuth, (req: AuthedRequest, res) => {
  const subclubId = String(req.query.subclubId || '')
  const total = Array.from(db.wbtc.values()).filter(w => w.subclubId === subclubId).reduce((a, b) => a + b.wbtcQty, 0)
  return res.json(ok({ subclubId, totalWbtc: total }))
})

app.post('/emergency/pause', requireAuth, requireSignature, (req: AuthedRequest, res) => {
  db.ops.paused = true
  return res.json(ok({ paused: true }))
})

app.post('/emergency/withdraw', requireAuth, requireSignature, (req: AuthedRequest, res) => {
  const { subclubId } = req.body || {}
  if (!subclubId) return res.status(400).json(err('bad_request', 'Missing subclubId'))
  const totalDeposits = Array.from(db.deposits.values()).filter(d => d.subclubId === subclubId && d.userId === req.userId!).reduce((a, b) => a + b.amountUSD, 0)
  return res.json(ok({ refundableUSD: totalDeposits }))
})

app.post('/admin/warp', requireAuth, requireSignature, (req: AuthedRequest, res) => {
  const { subclubId, weeks } = req.body || {}
  if (!subclubId || typeof weeks !== 'number' || weeks <= 0) return res.status(400).json(err('bad_request', 'Provide subclubId and weeks>0'))
  warpWeeks(subclubId, weeks)
  return res.json(ok({ warped: weeks }))
})

const port = Number(process.env.PORT || 8080)
app.listen(port)
