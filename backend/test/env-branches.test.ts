import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const originalEnv = { ...process.env }

describe('ENV branches', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })
  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('throws on invalid env schema (missing JWT_SECRET)', async () => {
    process.env.NETWORK = 'amoy'
    process.env.CHAIN_ID = '80002'
    delete process.env.JWT_SECRET
    process.env.VAULT_CLUB_API_KEY = 'k'
    process.env.HMAC_SECRET = 'h'
    await expect(import('../src/config/env')).rejects.toThrow(/Invalid environment/)
  })

  it('throws on non-Amoy network', async () => {
    process.env.NETWORK = 'mainnet'
    process.env.CHAIN_ID = '137'
    process.env.JWT_SECRET = 'x'.repeat(16)
    process.env.VAULT_CLUB_API_KEY = 'k'
    process.env.HMAC_SECRET = 'h'
    await expect(import('../src/config/env')).rejects.toThrow(/Non-Amoy/)
  })

  it('loads successfully on Amoy', async () => {
    process.env.NETWORK = 'amoy'
    process.env.CHAIN_ID = '80002'
    process.env.JWT_SECRET = 'x'.repeat(16)
    process.env.VAULT_CLUB_API_KEY = 'k'
    process.env.HMAC_SECRET = 'h'
    const mod = await import('../src/config/env')
    expect(mod.ENV.network.toLowerCase()).toBe('amoy')
    expect(mod.ENV.chainId).toBe(80002)
  })
})
