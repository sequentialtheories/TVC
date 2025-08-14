import axios from 'axios'
import { ENV } from '../config/env'

type AuthResponse = {
  success: boolean
  data?: {
    user: { id: string; email: string; name?: string | null }
    wallet: { address: string; network: string } | null
    api_key?: string | null
    session?: { access_token?: string; refresh_token?: string; expires_at?: number }
  }
  error?: string
}

export async function authenticateWithEmailPassword(email: string, password: string): Promise<AuthResponse> {
  const url = `${ENV.stApiAuthBase}/vault-club-auth-sync`
  const res = await axios.post(url, { email, password }, {
    headers: {
      'Content-Type': 'application/json',
      'x-vault-club-api-key': ENV.vaultClubApiKey
    },
    timeout: 15000
  })
  return res.data
}

export async function validateStAccessToken(stAccessToken: string): Promise<AuthResponse> {
  const whoamiUrl = `${ENV.stApiAuthBase}/whoami`
  try {
    const res = await axios.get(whoamiUrl, {
      headers: {
        'Authorization': `Bearer ${stAccessToken}`,
        'x-vault-club-api-key': ENV.vaultClubApiKey
      },
      timeout: 10000
    })
    return res.data
  } catch (e: any) {
    if (e.response) return e.response.data
    throw e
  }
}

export async function externalApiUserWallets(apiKey: string, q: { email?: string; user_id?: string } = {}) {
  const base = ENV.stExternalApiBase
  const url = `${base}/external-api/user-wallets`
  const params: Record<string, string> = {}
  if (q.email) params.email = q.email
  if (q.user_id) params.user_id = q.user_id
  const res = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    params,
    timeout: 15000
  })
  return res.data
}

export async function proxyToFunction(method: 'GET' | 'POST', path: string, body: any, headers: Record<string, string>) {
  const url = `${ENV.stApiAuthBase}${path}`
  const res = await axios.request({
    url,
    method,
    data: body,
    headers,
    timeout: 30000
  })
  return res
}
