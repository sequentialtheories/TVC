import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { db } from '../storage.js'

export type AuthedRequest = Request & { userId?: string }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (!token) return res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Missing token' } })
    const secret = process.env.TVC_JWT_SECRET || ''
    const payload = jwt.verify(token, secret) as { userId: string }
    req.userId = payload.userId
    const wallet = db.wallets.get(payload.userId)
    if (!wallet) return res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Wallet not bound' } })
    if ((process.env.POLYGON_CHAIN_ID || '') !== '80002') {
      return res.status(400).json({ success: false, error: { code: 'testnet_only', message: 'Chain must be Amoy 80002' } })
    }
    next()
  } catch {
    res.status(401).json({ success: false, error: { code: 'unauthorized', message: 'Invalid token' } })
  }
}
