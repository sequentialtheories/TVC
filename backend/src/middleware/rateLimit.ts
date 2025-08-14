import rateLimit from 'express-rate-limit'

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
})

export const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const uid = (req as any).tvcUser?.userId
    return uid || req.ip
  },
  standardHeaders: true,
  legacyHeaders: false
})
