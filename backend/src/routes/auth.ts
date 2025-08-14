import { Router, Request, Response } from 'express'
import { signSession } from '../utils/jwt'
import { cookieOptions } from '../config/security'
import { authenticateWithEmailPassword, validateStAccessToken } from '../services/stClient'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const { stAccessToken, email, password } = (req.body || {}) as { stAccessToken?: string; email?: string; password?: string }

  try {
    let authData: any = null

    if (stAccessToken) {
      const resp = await validateStAccessToken(stAccessToken)
      if (resp?.success && resp.data) {
        authData = { ...resp.data, stAccessToken }
      }
    }

    if (!authData && email && password) {
      const resp = await authenticateWithEmailPassword(email, password)
      if (resp?.success && resp.data) {
        authData = { ...resp.data, stAccessToken: resp.data.session?.access_token || null }
      }
    }

    if (!authData) {
      return res.status(401).json({ success: false, error: 'Authentication failed' })
    }

    const payload = {
      userId: authData.user.id,
      email: authData.user.email,
      wallet: authData.wallet || null,
      stAccessToken: authData.stAccessToken || null
    }

    const token = signSession(payload)
    const isProd = process.env.NODE_ENV === 'production'
    res.cookie('tvc_session', token, cookieOptions(isProd))
    return res.json({ success: true, data: { user: authData.user, wallet: authData.wallet } })
  } catch (_e) {
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/me', (req: Request, res: Response) => {
  const user = (req as any).tvcUser
  if (!user) return res.status(401).json({ success: false, error: 'Not authenticated' })
  return res.json({ success: true, data: { user: { id: user.userId, email: user.email }, wallet: user.wallet || null } })
})

router.post('/logout', (req: Request, res: Response) => {
  const isProd = process.env.NODE_ENV === 'production'
  res.clearCookie('tvc_session', cookieOptions(isProd))
  res.json({ success: true })
})

export default router
