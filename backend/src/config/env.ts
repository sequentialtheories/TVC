import dotenv from 'dotenv'
import { z } from 'zod'

if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
}

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(4000),
  NETWORK: z.string(),
  CHAIN_ID: z.coerce.number(),
  JWT_SECRET: z.string().min(16),
  VAULT_CLUB_API_KEY: z.string().min(1),
  HMAC_SECRET: z.string().min(1),
  ST_API_AUTH: z.string().url().optional().nullable(),
  ST_EXTERNAL_API: z.string().url().optional().nullable(),
  FRONTEND_ORIGIN: z.string().optional().nullable(),
  HMAC_REQUIRED: z.enum(['true', 'false']).default('true')
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Invalid environment: ${parsed.error.message}`)
}

const env = parsed.data

if (env.NETWORK.toLowerCase() !== 'amoy' || env.CHAIN_ID !== 80002) {
  throw new Error('Non-Amoy network detected. Set NETWORK=amoy and CHAIN_ID=80002.')
}

export const ENV = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  network: env.NETWORK,
  chainId: env.CHAIN_ID,
  jwtSecret: env.JWT_SECRET,
  vaultClubApiKey: env.VAULT_CLUB_API_KEY,
  hmacSecret: env.HMAC_SECRET,
  stApiAuthBase: env.ST_API_AUTH || '',
  stExternalApiBase: env.ST_EXTERNAL_API || '',
  frontendOrigin: env.FRONTEND_ORIGIN || '',
  hmacRequired: env.HMAC_REQUIRED === 'true'
}
