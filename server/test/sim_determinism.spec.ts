import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../src/storage.js'
import { runEpoch, warpWeeks } from '../src/sim.js'
import type { Subclub } from '../src/types.js'

function resetAll() {
  db.epochs.clear()
  db.deposits.clear()
  db.penalties.clear()
  db.memberships.clear()
  db.subclubs.clear()
  db.wbtc.clear()
  db.ops.paused = false
}

function makeSubclub(id: string, extras: Partial<Subclub> = {}) {
  db.subclubs.set(id, {
    id,
    ownerUserId: 'owner',
    name: 'Test',
    lockupWeeks: 52,
    rigor: 'medium',
    status: 'active',
    private: true,
    chargedContract: false,
    maxMembers: 4,
    startWeek: 0,
    phase2Trigger: { byTime: false, byTVL: false },
    inviteTokenHash: null,
    weeklyDepositUSD: 100,
    ...extras
  })
  db.memberships.set(`${id}:owner`, { subclubId: id, userId: 'owner', shareWeight: 1, missedDeposits: 0, depositsTotalUSD: 0 })
}

function hashEpochs(subclubId: string) {
  const items = Array.from(db.epochs.values()).filter(e => e.subclubId === subclubId).sort((a,b)=>a.week-b.week)
  const fixed = items.map(e => ({
    w: e.week,
    p1: +e.p1USD.toFixed(6),
    p2: +e.p2USD.toFixed(6),
    p3: +e.p3USD.toFixed(6),
    d: +e.dcaUSD.toFixed(6)
  }))
  const s = JSON.stringify(fixed)
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return h
}

beforeEach(() => resetAll())

describe('sim.determinism.snapshot', () => {
  it('warpWeeks produces deterministic snapshots', () => {
    const id = 'detClub'
    makeSubclub(id, { lockupWeeks: 10 })
    const now = 0
    for (let w = now; w < now + 3; w++) {
      db.deposits.set(`dep${w}`, { id: `dep${w}`, subclubId: id, userId: 'owner', week: w, amountUSD: 500, createdAt: 1 })
      runEpoch(id, w)
    }
    const h1 = hashEpochs(id)

    resetAll()
    makeSubclub(id, { lockupWeeks: 10 })
    for (let w = now; w < now + 3; w++) {
      db.deposits.set(`dep${w}`, { id: `dep${w}`, subclubId: id, userId: 'owner', week: w, amountUSD: 500, createdAt: 1 })
      runEpoch(id, w)
    }
    const h2 = hashEpochs(id)

    expect(h1).toBe(h2)

    resetAll()
    makeSubclub(id, { lockupWeeks: 10 })
    warpWeeks(id, 3)
    const h3 = hashEpochs(id)

    const prev = h3
    resetAll()
    makeSubclub(id, { lockupWeeks: 10 })
    warpWeeks(id, 3)
    const again = hashEpochs(id)
    expect(again).toBe(prev)
  })
})
