import { Request, Response, NextFunction } from 'express'
import { verifySession } from '../utils/jwt'

declare global {
  namespace Express {
    interface Request {
      tvcUser?: {
        userId: string
        email: string
        wallet?: { address: string; network: string } | null
        stAccessToken?: string | null
      }
      requestId?: string
    }
  }
}

export function sessionMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.tvc_session
  if (token) {
    try {
      const payload = verifySession(token)
      req.tvcUser = payload
    } catch {
    }
  }
  next()
}
