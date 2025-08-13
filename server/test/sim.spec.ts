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
}

function makeSubclub(id: string, extras: Partial<Subclub> = {}) {
  db.subclubs.set(id, {
    id,
    ownerUserId: 'owner',
    name: 'Test',
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

describe('sim.epoch.runsWithExactRRLMatrix', () => {
  it('matches golden vectors for one week update', () => {
    const subclubId = 'testclub'
    makeSubclub(subclubId)

    db.epochs.set(`${subclubId}:${0}`, {
      subclubId, week: 0,
      p1USD: 1000, p2USD: 6000, p3USD: 3000,
      profitP1: 0, profitP2: 0, profitP3: 0,
      tvlUSD: 10000, phase2Active: false, dcaUSD: 0, btcPrice: 0
    })

    const depId = 'dep1'
    db.deposits.set(depId, { id: depId, subclubId, userId: 'user1', week: 1, amountUSD: 800, createdAt: Date.now() })

    runEpoch(subclubId, 1)

    const e1 = db.epochs.get(`${subclubId}:${1}`)
    expect(e1).toBeTruthy()

    const tol = 1e-2
    expect(Math.abs(e1!.p1USD - 1083.09)).toBeLessThanOrEqual(tol)
    expect(Math.abs(e1!.p2USD - 6475.52)).toBeLessThanOrEqual(tol)
    expect(Math.abs(e1!.p3USD - 3241.39)).toBeLessThanOrEqual(tol)
  })
})

describe('sim.depositSplit.enforces10_60_30', () => {
  it('allocates weekly D into D1/D2/D3 at 10/60/30', () => {
    const subclubId = 'splitclub'
    makeSubclub(subclubId)

    const week = 5
    const D = 1000
    const depId = 'dep2'
    db.deposits.set(depId, { id: depId, subclubId, userId: 'user2', week, amountUSD: D, createdAt: Date.now() })

    runEpoch(subclubId, week)
    const after = db.epochs.get(`${subclubId}:${week}`)!

    expect(after.p1USD).toBeCloseTo(100, 1)
    expect(after.p2USD).toBeCloseTo(600, 1)
    expect(after.p3USD).toBeCloseTo(300, 1)
    expect(after.tvlUSD).toBeCloseTo(1000, 1)
  })
})
