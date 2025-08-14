# DECISIONS

- Scope: Implement a proxy-only Express backend bridge. All business logic remains in Supabase Edge Functions.
- SSO Flow: Prefer token-first SSO ({ stAccessToken }) to /auth/login. If token validation is unavailable, temporarily support email/password via ST auth function.
- Sessions: TVC issues short-lived JWT stored in httpOnly+secure cookie. Session payload includes user id, email, wallet, and, if applicable, an ST token for proxying.
- Testnet-first: Enforce Amoy-only (NETWORK=amoy, CHAIN_ID=80002). Fail fast at startup and in CI if not Amoy.
- Proxies: Forward /vault/* and /emergency/* routes to Supabase Edge Functions, attaching required headers (Authorization bearer when available, x-vault-club-api-key when required). No duplication of vault logic.
- Security Middleware: CORS (configurable origin), simple rate limiting, and HMAC signature requirement for mutating routes. HMAC_SECRET is configurable via env; HMAC checks can be disabled for local tests as needed.
- Coverage: Vitest with clover.xml reporting. CI enforces >=80% coverage. Plan to ratchet later.
- Configuration: All external URLs and secrets come from env. No hardcoding.
- Future: Replace temporary email/password fallback once token validation endpoint is available.
