import crypto from 'crypto'
import { Epoch, Membership, Penalty, Subclub, User, Wallet, WbtcLedger } from './types.js'

export const db = {
  users: new Map<string, User>(),
  wallets: new Map<string, Wallet>(),
  subclubs: new Map<string, Subclub>(),
  memberships: new Map<string, Membership>(),
  epochs: new Map<string, Epoch>(),
  deposits: new Map<string, { id: string; subclubId: string; userId: string; week: number; amountUSD: number; createdAt: number }>(),
  penalties: new Map<string, Penalty>(),
  wbtc: new Map<string, WbtcLedger>(),
  ops: { paused: false as boolean, circuitBreaker: false as boolean, lastJobRunAt: 0 as number }
}

export function makeId(prefix: string = 'id'): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`
}

export function makeHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function getWeekNow(): number {
  return Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
}
