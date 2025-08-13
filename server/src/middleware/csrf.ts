import type { Request, Response, NextFunction } from 'express'

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  if (process.env.ALLOW_UNSIGNED_MUTATIONS === '1') return next()
  const token = req.header('X-CSRF-Token')
  if (!token) return res.status(401).json({ success: false, error: { code: 'csrf_missing', message: 'Missing X-CSRF-Token' } })
  next()
}
