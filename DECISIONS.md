Canonical decisions for TVC (frontend)

- SSO: token-first ({ stAccessToken }) → /auth/login (bridge), HttpOnly cookie; fragment /#token= allowed; never querystring ?token=.
- Bridge: proxy-only to Supabase functions (no duplicate business logic).
- Testnet-first: FEATURE_TESTNET_ONLY=1, CHAIN_ID=80002 hard fail otherwise.
- Economics: Deposit split 10/60/30 (P1/P2/P3), RRL matrix as specified, rounding to 1e-8, epoch = weekly.
- Phase 2: trigger = week ≥ 50% lockup or TVL ≥ $2,000,000, rigor-based DCA, fund from P2/P3 (5–10%).
- Invites: single-use tokens, server-validated; never raw IDs in links.
- Emergency: Pause blocks mutators; Emergency Withdraw refunds net deposits only.
- Security: HMAC on mutators, strict CORS, CSRF for cookie flows, wallet binding to ST registry, RLS enforced.
- Telemetry: request-id on every response; logs redact tokens (first 4 / last 4 chars only).

This document is canonical. The Sequence Theory repo links here for the authoritative decisions.
