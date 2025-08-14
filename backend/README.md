# TVC Backend Bridge

Proxy-only Express gateway for The Vault Club. Provides:
- Token-first SSO via ST (fallback: email/password)
- TVC cookie session (JWT)
- CORS, rate limits, HMAC signature on mutators
- Proxy routes to Supabase Edge Functions
- Vitest tests with clover.xml coverage (>=80%)

## Setup
- Copy .env.example to .env and fill values.
- Ensure NETWORK=amoy and CHAIN_ID=80002.

## Scripts
- npm run dev
- npm run build && npm start
- npm run test (coverage clover.xml)
- npm run typecheck

## Routes
- POST /auth/login { stAccessToken } or { email, password }
- GET /auth/me
- POST /auth/logout
- Vault/Admin proxy:
  - POST /vault/init-subclub
  - POST /vault/join
  - POST /vault/deposit
  - POST /vault/harvest
  - GET /vault/progress
  - GET /vault/wbtc-balance
  - POST /emergency/pause
  - POST /emergency/withdraw

## Env
See .env.example. Do not hardcode secrets. Required bases:
- ST_API_AUTH
- ST_EXTERNAL_API
- VAULT_CLUB_API_KEY
- JWT_SECRET
- NETWORK=amoy
- CHAIN_ID=80002
