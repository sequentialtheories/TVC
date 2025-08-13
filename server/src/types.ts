export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: { code: string; message: string }
}

export type User = {
  id: string
  email: string
  displayName: string
}

export type Wallet = {
  address: string
  chainId: number
}

export type Permissions = ('deposit' | 'emergency_withdraw' | 'admin')[]

export type Subclub = {
  id: string
  ownerUserId: string
  name: string
  lockupWeeks: number
  rigor: 'light' | 'medium' | 'heavy'
  status: 'pending' | 'active' | 'paused' | 'phase2' | 'completed'
  private: boolean
  chargedContract: boolean
  maxMembers: number
  startWeek: number
  phase2Trigger: { byTime: boolean; byTVL: boolean }
  inviteTokenHash: string | null
  inviteTokenExpiresAt?: number
  weeklyDepositUSD?: number
}

export type Membership = {
  subclubId: string
  userId: string
  shareWeight: number
  missedDeposits: number
  depositsTotalUSD: number
}

export type Epoch = {
  subclubId: string
  week: number
  p1USD: number
  p2USD: number
  p3USD: number
  profitP1: number
  profitP2: number
  profitP3: number
  tvlUSD: number
  phase2Active: boolean
  dcaUSD: number
  btcPrice: number
}

export type Penalty = {
  id: string
  subclubId: string
  userId: string
  week: number
  deltaShare: number
  reason: string
}

export type WbtcLedger = {
  id: string
  subclubId: string
  week: number
  dcaUSD: number
  wbtcQty: number
  price: number
}
