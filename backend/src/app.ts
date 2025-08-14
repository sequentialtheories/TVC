import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import morgan from 'morgan'
import requestId from 'express-request-id'
import { ENV } from './config/env'
import { sessionMiddleware } from './middleware/session'
import { globalLimiter, userLimiter } from './middleware/rateLimit'
import { hmacRequiredForMutations } from './middleware/hmac'
import authRoutes from './routes/auth'
import proxyRoutes from './routes/proxy'

const app = express()

const corsOptions = {
  origin: ENV.frontendOrigin || '*',
  credentials: true
}

app.use(requestId())
app.use(morgan('combined'))
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use(sessionMiddleware)
app.use(globalLimiter)
app.use(userLimiter)
app.use(hmacRequiredForMutations)

app.get('/healthz', (_req, res) => res.json({ ok: true, network: ENV.network, chainId: ENV.chainId }))

app.use('/auth', authRoutes)
app.use('/', proxyRoutes)

export default app
