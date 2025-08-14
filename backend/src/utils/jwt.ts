import jwt from 'jsonwebtoken'
import { ENV } from '../config/env'

type SessionPayload = {
  userId: string
  email: string
  wallet?: { address: string; network: string } | null
  stAccessToken?: string | null
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, ENV.jwtSecret, { expiresIn: '1h' })
}

export function verifySession<T = SessionPayload>(token: string): T {
  return jwt.verify(token, ENV.jwtSecret) as T
}
