import { describe, it, expect } from 'vitest'

describe('Environment guard', () => {
  it('env must be amoy/80002 (checked at module load)', async () => {
    const mod = await import('../src/config/env')
    expect(mod.ENV.network.toLowerCase()).toBe('amoy')
    expect(mod.ENV.chainId).toBe(80002)
  })
})
