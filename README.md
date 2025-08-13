# The Vault Club (TVC) — MVP Simulation Backend

This repository contains the TVC simulation backend bridge and supporting test/CI configuration. The MVP provides:
- SSO via Sequence Theory (ST) Supabase functions (server-to-server)
- Wallet binding to the ST-issued wallet; MetaMask is disabled on the frontend (frontend not in this repo)
- Vault lifecycle endpoints, weekly simulation (RRL matrix), penalties, Phase-2 DCA, and emergency flows
- Deterministic time-warp for testing, invite tokens for joining subclubs
- CI with coverage gate and testnet-only enforcement (Polygon Amoy 80002)

Quick start
1) Prepare env
- Copy ./server/.env.example to ./server/.env and ./.env.example to ./.env, then fill placeholders:
  - TVC_JWT_SECRET, TVC_SIGNING_SECRET
  - ST_AUTH_URL, ST_EXTERNAL_API_BASE, ST_VAULT_CLUB_API_KEY
  - FEATURE_TESTNET_ONLY=1, POLYGON_CHAIN_ID=80002
  - CORS_ORIGIN (default http://localhost:5173)
  - ALLOW_UNSIGNED_MUTATIONS=1 is allowed for local dev/tests
2) Install and test
- cd server && npm ci && npm test
3) Run locally
- cd server && npm run dev (or npm run build && npm start)

Endpoints (JSON envelopes: { success, data?, error? })
- POST /auth/login { email, password } -> { tvcJwt, user, wallet, permissions }
- GET /wallet/me -> { address, chainId }
- POST /vault/init-subclub -> { subclubId, inviteToken } (auth + CSRF + signature)
- POST /vault/join { inviteToken } -> { subclubId } (auth + CSRF + signature)
- POST /vault/deposit { subclubId, amountUSD, epoch? } -> { depositedUSD, byStrandUSD, week } (auth + CSRF + signature)
- GET /vault/progress?subclubId=... -> progress snapshot (members, epoch, penalties, phase2, tvlUSD)
- GET /vault/wbtc-balance?subclubId=... -> wBTC totals (sim)
- POST /emergency/pause -> { paused } (auth + CSRF + signature)
- POST /emergency/withdraw { subclubId } -> { refundableUSD } (shareWeight set to 0)
- GET /admin/epochs?limit=8 -> latest epochs
- POST /admin/warp { subclubId, weeks } -> { warped } (auth + signature)

Notes
- Mutating endpoints require HMAC signing header: X-TVC-Signature = HMAC_SHA256(body, TVC_SIGNING_SECRET). Tests use ALLOW_UNSIGNED_MUTATIONS=1.
- Strict testnet-only: chainId must be 80002. No mainnet.
- Phase-1 deposit split is fixed at 10/60/30 across strands. RRL matrix is validated with golden vectors.
- Penalties: –3% shareWeight every 3 missed deposits; surfaced via /vault/progress.
- Phase-2 trigger: 50% lockup elapsed OR TVL ≥ $2,000,000; DCA per rigor: light=$1k, medium=$5k, heavy=$10k.
- Determinism: warp and snapshot hashing tests ensure stable outputs.

CI
- GitHub Actions runs backend tests with coverage parsed from coverage/clover.xml
- Coverage gate is ≥80% for MVP; plan is to ratchet to 95%

PR/Session
- Link to Devin run: https://app.devin.ai/sessions/1cedf8a3933e42fbb937fc74f07ad327
- Requested by: @derrickjr1570836924
