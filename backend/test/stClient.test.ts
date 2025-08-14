import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import nock from 'nock'

vi.mock('../src/config/env', async () => {
  const actual = await vi.importActual<any>('../src/config/env')
  return {
    ENV: {
      ...actual.ENV,
      stApiAuthBase: 'https://example.supabase.co/functions/v1',
      stExternalApiBase: 'https://example.supabase.co/functions/v1',
      vaultClubApiKey: 'test-key'
    }
  }
})

describe('stClient', () => {
  beforeEach(() => {
    nock.cleanAll()
  })
  afterEach(() => {
    nock.cleanAll()
  })

  it('validates ST access token', async () => {
    const { validateStAccessToken } = await import('../src/services/stClient')
    nock('https://example.supabase.co')
      .get('/functions/v1/whoami')
      .reply(200, { success: true, data: { user: { id: 'u1', email: 'e@x.com' }, wallet: { address: '0xabc' } } })
    const resp = await validateStAccessToken('tok')
    expect(resp.success).toBe(true)
    expect(resp.data!.user.id).toBe('u1')
  })

  it('authenticates with email/password', async () => {
    const { authenticateWithEmailPassword } = await import('../src/services/stClient')
    nock('https://example.supabase.co')
      .post('/functions/v1/vault-club-auth-sync', { email: 'e@x.com', password: 'pw' })
      .matchHeader('x-vault-club-api-key', 'test-key')
      .reply(200, { success: true, data: { user: { id: 'u1', email: 'e@x.com' }, wallet: { address: '0xabc' }, session: { access_token: 'st' } } })
    const resp = await authenticateWithEmailPassword('e@x.com', 'pw')
    expect(resp.success).toBe(true)
    expect(resp.data!.wallet!.address).toBe('0xabc')
  })

  it('proxies to function - POST', async () => {
    const { proxyToFunction } = await import('../src/services/stClient')
    const payload = { amount: '1' }
    nock('https://example.supabase.co')
      .post('/functions/v1/vault-deposit', payload)
      .matchHeader('x-vault-club-api-key', 'test-key')
      .reply(200, { success: true })
    const resp = await proxyToFunction('POST', '/vault-deposit', payload, { 'x-vault-club-api-key': 'test-key' })
    expect(resp.status).toBe(200)
    expect(resp.data.success).toBe(true)
  })

  it('proxies to function - GET', async () => {
    const { proxyToFunction } = await import('../src/services/stClient')
    nock('https://example.supabase.co')
      .get('/functions/v1/vault-balance')
      .matchHeader('x-vault-club-api-key', 'test-key')
      .reply(200, { success: true, data: { balance: '0' } })
    const resp = await proxyToFunction('GET', '/vault-balance', undefined, { 'x-vault-club-api-key': 'test-key' })
    expect(resp.status).toBe(200)
    expect(resp.data.data.balance).toBe('0')
  })
})
