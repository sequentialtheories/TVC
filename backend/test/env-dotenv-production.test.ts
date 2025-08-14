import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalEnv = { ...process.env }

describe('ENV dotenv production branch', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('does not call dotenv in production and still loads env', async () => {
    process.env.NODE_ENV = 'production'
    process.env.NETWORK = 'amoy'
    process.env.CHAIN_ID = '80002'
    process.env.JWT_SECRET = 'x'.repeat(16)
    process.env.VAULT_CLUB_API_KEY = 'k'
    process.env.HMAC_SECRET = 'h'
    const mod = await import('../src/config/env')
    expect(mod.ENV.nodeEnv).toBe('production')
    expect(mod.ENV.network.toLowerCase()).toBe('amoy')
    expect(mod.ENV.chainId).toBe(80002)
  })
})
