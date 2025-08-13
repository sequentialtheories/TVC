import { db, getWeekNow, makeId } from './storage.js'
import { Epoch, Membership, Subclub, WbtcLedger } from './types.js'

const RATE_WEEKLY = {
  p1: 0.0008,
  p2: 0.0016,
  p3: 0.0029
}

function ensureEpoch(subclubId: string, week: number): Epoch {
  const key = `${subclubId}:${week}`
  const e = db.epochs.get(key)
  if (e) return e
  const created: Epoch = { subclubId, week, p1USD: 0, p2USD: 0, p3USD: 0, profitP1: 0, profitP2: 0, profitP3: 0, tvlUSD: 0, phase2Active: false, dcaUSD: 0, btcPrice: 0 }
  db.epochs.set(key, created)
  return created
}

function getPrevEpochTotals(subclubId: string, week: number) {
  const prevWeek = week - 1
  if (prevWeek < 0) return { V1: 0, V2: 0, V3: 0 }
  const prev = db.epochs.get(`${subclubId}:${prevWeek}`)
  if (!prev) return { V1: 0, V2: 0, V3: 0 }
  return { V1: prev.p1USD, V2: prev.p2USD, V3: prev.p3USD }
}

function getMembers(subclubId: string): Membership[] {
  return Array.from(db.memberships.values()).filter(m => m.subclubId === subclubId)
}

function totalDepositsForWeek(subclubId: string, week: number): number {
  return Array.from(db.deposits.values()).filter(d => d.subclubId === subclubId && d.week === week).reduce((a, b) => a + b.amountUSD, 0)
}

function applyPenalties(sub: Subclub, week: number) {
  const members = getMembers(sub.id)
  for (const mem of members) {
    const madeDeposit = Array.from(db.deposits.values()).some(d => d.subclubId === sub.id && d.userId === mem.userId && d.week === week)
    if (!madeDeposit) {
      mem.missedDeposits += 1
      const mKey = `${sub.id}:${mem.userId}`
      db.memberships.set(mKey, mem)
      if (mem.missedDeposits % 3 === 0) {
        const old = mem.shareWeight
        mem.shareWeight = mem.shareWeight * 0.97
        db.memberships.set(mKey, mem)
        const penId = makeId('pen')
        db.penalties.set(penId, { id: penId, subclubId: sub.id, userId: mem.userId, week, deltaShare: mem.shareWeight - old, reason: '3 missed deposits' })
      }
    }
  }
}

function maybeTriggerPhase2(sub: Subclub, week: number) {
  const elapsed = week - sub.startWeek
  if (elapsed >= Math.floor(sub.lockupWeeks / 2)) sub.phase2Trigger.byTime = true
  const tvl = Array.from(db.epochs.values()).filter(e => e.subclubId === sub.id).reduce((a, b) => a + b.p1USD + b.p2USD + b.p3USD, 0)
  if (tvl >= 2_000_000) sub.phase2Trigger.byTVL = true
  if (sub.phase2Trigger.byTime || sub.phase2Trigger.byTVL) {
    if (sub.status !== 'phase2') sub.status = 'phase2'
    db.subclubs.set(sub.id, sub)
  }
}

function getWeeklyDcaUSD(rigor: Subclub['rigor']): number {
  if (rigor === 'light') return 1000
  if (rigor === 'heavy') return 10000
  return 5000
}

function getDcaDrainPercent(rigor: Subclub['rigor']): number {
  if (rigor === 'light') return 0.05
  if (rigor === 'heavy') return 0.10
  return 0.075
}

export function runEpoch(subclubId: string, week?: number) {
  const sub = db.subclubs.get(subclubId)
  if (!sub) return
  const w = typeof week === 'number' ? week : getWeekNow()
  if (db.ops.paused) return
  const epoch = ensureEpoch(sub.id, w)

  applyPenalties(sub, w)

  const D = totalDepositsForWeek(sub.id, w)
  const D1 = D * 0.10
  const D2 = D * 0.60
  const D3 = D * 0.30

  const prev = getPrevEpochTotals(sub.id, w)
  const P1 = prev.V1 * RATE_WEEKLY.p1
  const P2 = prev.V2 * RATE_WEEKLY.p2
  const P3 = prev.V3 * RATE_WEEKLY.p3

  const V1p = prev.V1 + D1 + 0.3 * P3 + 0.1 * P2 - 0.6 * P1
  const V2p = prev.V2 + D2 + 0.4 * P1 - 0.5 * P2
  const V3p = prev.V3 + D3 + 0.2 * P1 + 0.4 * P2 - 0.3 * P3

  epoch.p1USD = V1p
  epoch.p2USD = V2p
  epoch.p3USD = V3p
  epoch.profitP1 = P1
  epoch.profitP2 = P2
  epoch.profitP3 = P3
  epoch.tvlUSD = V1p + V2p + V3p

  maybeTriggerPhase2(sub, w)

  if (sub.status === 'phase2') {
    const dcaUSD = getWeeklyDcaUSD(sub.rigor)
    const drainPct = getDcaDrainPercent(sub.rigor)
    const drainFromP2 = epoch.p2USD * drainPct
    const drainFromP3 = epoch.p3USD * drainPct
    let totalDrained = drainFromP2 + drainFromP3
    let usedUSD = Math.min(dcaUSD, totalDrained)
    const ratio = totalDrained > 0 ? usedUSD / totalDrained : 0
    epoch.p2USD -= drainFromP2 * ratio
    epoch.p3USD -= drainFromP3 * ratio
    epoch.dcaUSD = usedUSD
    const price = epoch.btcPrice || 65000
    const wbtcQty = usedUSD / price
    const wid = makeId('wbtc')
    const rec: WbtcLedger = { id: wid, subclubId: sub.id, week: w, dcaUSD: usedUSD, wbtcQty, price }
    db.wbtc.set(wid, rec)
    epoch.phase2Active = true
  }

  db.epochs.set(`${sub.id}:${w}`, epoch)
}

export function warpWeeks(subclubId: string, weeks: number) {
  const now = getWeekNow()
  for (let i = 0; i < weeks; i++) {
    runEpoch(subclubId, now + i)
  }
}
