import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export function requireSignature(req: Request, res: Response, next: NextFunction) {
  if (process.env.ALLOW_UNSIGNED_MUTATIONS === '1') return next()
  const secret = process.env.TVC_SIGNING_SECRET || ''
  if (!secret) return res.status(500).json({ success: false, error: { code: 'server_config', message: 'Signing secret not set' } })
  const sig = req.headers['x-tvc-signature']
  if (typeof sig !== 'string') return res.status(401).json({ success: false, error: { code: 'signature_missing', message: 'Missing signature' } })
  const body = JSON.stringify(req.body || {})
  const h = crypto.createHmac('sha256', secret).update(body).digest('hex')
  if (h !== sig) return res.status(401).json({ success: false, error: { code: 'signature_invalid', message: 'Invalid signature' } })
  next()
}
