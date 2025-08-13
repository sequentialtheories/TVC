import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/storage.js'
import { runEpoch } from '../src/sim.js'
import type { Subclub } from '../src/types.js'

function resetAll() {
  db.epochs.clear()
  db.deposits.clear()
  db.penalties.clear()
  db.memberships.clear()
  db.subclubs.clear()
  db.wbtc.clear()
  db.ops.paused = false
  db.ops.circuitBreaker = false
}

function makeSubclub(id: string, extras: Partial<Subclub> = {}) {
  db.subclubs.set(id, {
    id,
    ownerUserId: 'owner',
    name: 'Club',
    lockupWeeks: 520,
    rigor: 'medium',
    status: 'active',
    private: true,
    chargedContract: false,
    maxMembers: 4,
    startWeek: 0,
    phase2Trigger: { byTime: false, byTVL: false },
    inviteTokenHash: null,
    weeklyDepositUSD: 0,
    ...extras
  })
}

beforeEach(() => resetAll())

describe('sim.penalties.appliesMinus3PercentOnThirdMiss', () => {
  it('applies -3% to shareWeight on every 3rd missed week', () => {
    const subclubId = 'penclub'
    makeSubclub(subclubId)
    const userId = 'u1'
    db.memberships.set(`${subclubId}:${userId}`, {
      subclubId, userId, shareWeight: 1, missedDeposits: 0, depositsTotalUSD: 0
    })

    runEpoch(subclubId, 1) // miss #1
    runEpoch(subclubId, 2) // miss #2
    runEpoch(subclubId, 3) // miss #3 -> penalty applies

    const mem = db.memberships.get(`${subclubId}:${userId}`)!
    expect(mem.missedDeposits).toBe(3)
    expect(mem.shareWeight).toBeCloseTo(0.97, 8)

    const pen = Array.from(db.penalties.values()).find(p => p.subclubId === subclubId && p.userId === userId && p.week === 3)
    expect(pen).toBeTruthy()
    expect(pen!.deltaShare).toBeCloseTo(-0.03, 8)
    expect(pen!.reason).toBe('3 missed deposits')
  })
})

describe('phase2.triggersByTime', () => {
  it('activates phase2 at 50% lockup elapsed', () => {
    const subclubId = 'timeclub'
    makeSubclub(subclubId, { lockupWeeks: 10, startWeek: 0 })
    for (let w = 1; w <= 5; w++) runEpoch(subclubId, w)
    const sub = db.subclubs.get(subclubId)!
    expect(sub.status).toBe('phase2')
    expect(sub.phase2Trigger.byTime).toBe(true)
  })
})

describe('phase2.triggersByTVL', () => {
  it('activates phase2 when TVL >= 2,000,000', () => {
    const subclubId = 'tvlclub'
    makeSubclub(subclubId)
    db.epochs.set(`${subclubId}:0`, {
      subclubId, week: 0,
      p1USD: 700000, p2USD: 800000, p3USD: 500000,
      profitP1: 0, profitP2: 0, profitP3: 0,
      tvlUSD: 2000000, phase2Active: false, dcaUSD: 0, btcPrice: 0
    })
    db.deposits.set('d1', { id: 'd1', subclubId, userId: 'u1', week: 1, amountUSD: 100, createdAt: Date.now() })
    runEpoch(subclubId, 1)
    const sub = db.subclubs.get(subclubId)!
    expect(sub.status).toBe('phase2')
    expect(sub.phase2Trigger.byTVL).toBe(true)
  })
})

describe('phase2.dca.allocatesPerRigor', () => {
  it('uses $1k/$5k/$10k DCA by rigor and records wbtc ledger', () => {
    const subLight = 'light'
    makeSubclub(subLight, { rigor: 'light', startWeek: 0, lockupWeeks: 2 })
    db.epochs.set(`${subLight}:1`, {
      subclubId: subLight, week: 1,
      p1USD: 0, p2USD: 20000, p3USD: 20000,
      profitP1: 0, profitP2: 0, profitP3: 0,
      tvlUSD: 40000, phase2Active: false, dcaUSD: 0, btcPrice: 0
    })
    subLight // no-op to satisfy lints if any
    runEpoch(subLight, 2)
    const wbtcLight = Array.from(db.wbtc.values()).filter(w => w.subclubId === subLight)
    expect(wbtcLight.reduce((a, b) => a + b.dcaUSD, 0)).toBeGreaterThan(800)

    const subMed = 'medium'
    makeSubclub(subMed, { rigor: 'medium', startWeek: 0, lockupWeeks: 2 })
    db.epochs.set(`${subMed}:1`, {
      subclubId: subMed, week: 1,
      p1USD: 0, p2USD: 20000, p3USD: 20000,
      profitP1: 0, profitP2: 0, profitP3: 0,
      tvlUSD: 40000, phase2Active: false, dcaUSD: 0, btcPrice: 0
    })
    runEpoch(subMed, 2)
    const wbtcMed = Array.from(db.wbtc.values()).filter(w => w.subclubId === subMed)
    const totalMed = wbtcMed.reduce((a, b) => a + b.dcaUSD, 0)
    expect(totalMed).toBeGreaterThan(2800)
    expect(totalMed).toBeLessThan(5200)

    const subHeavy = 'heavy'
    makeSubclub(subHeavy, { rigor: 'heavy', startWeek: 0, lockupWeeks: 2 })
    db.epochs.set(`${subHeavy}:1`, {
      subclubId: subHeavy, week: 1,
      p1USD: 0, p2USD: 20000, p3USD: 20000,
      profitP1: 0, profitP2: 0, profitP3: 0,
      tvlUSD: 40000, phase2Active: false, dcaUSD: 0, btcPrice: 0
    })
    runEpoch(subHeavy, 2)
    const wbtcHeavy = Array.from(db.wbtc.values()).filter(w => w.subclubId === subHeavy)
    const totalHeavy = wbtcHeavy.reduce((a, b) => a + b.dcaUSD, 0)
    expect(totalHeavy).toBeGreaterThan(3500)
    expect(totalHeavy).toBeLessThan(10500)
  })
})
