import crypto from 'crypto'
import { Request, Response, NextFunction } from 'express'
import { ENV } from '../config/env'

export function hmacRequiredForMutations(req: Request, res: Response, next: NextFunction) {
  if (!ENV.hmacRequired) return next()
  if (req.method === 'GET') return next()
  const sigHeader = req.header('x-signature')
  if (!sigHeader) {
    return res.status(400).json({ success: false, error: 'Missing signature' })
  }
  const bodyRaw = JSON.stringify(req.body || {})
  const h = crypto.createHmac('sha256', ENV.hmacSecret).update(bodyRaw).digest('hex')
  if (h !== sigHeader) {
    return res.status(401).json({ success: false, error: 'Invalid signature' })
  }
  next()
}
