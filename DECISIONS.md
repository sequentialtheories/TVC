# Decisions

## 2025-08-13
- Backend bridge: Express app provides SSO, JWT, HMAC request signing (X-TVC-Signature), CSRF (double-submit), CORS, and rate limits. Test environment may bypass signing via ALLOW_UNSIGNED_MUTATIONS=1.
- Testnet-only: FEATURE_TESTNET_ONLY=1 with POLYGON_CHAIN_ID=80002 enforced. No mainnet deployments.
- Wallet binding: TVC uses ST-issued wallet only; MetaMask disabled in UI via DISABLE_METAMASK=1.
- Invite tokens: One-time, server-verified inviteToken; invalid/used returns 400.
- Deposit split: Phase-1 10/60/30 enforced for P1/P2/P3.
- RRL math: Implemented per matrix; golden vectors added to tests.
- Penalties: –3% share weight applied every 3 missed deposits; exposed in /vault/progress.
- Phase-2: Trigger if 50% lockup elapsed or TVL >= $2,000,000; weekly DCA by rigor; tracked in wbtc_ledger.
- Emergency: /emergency/pause sets circuit breaker; /emergency/withdraw returns deposits only (sim). Membership is marked exited and shareWeight set to 0 to prevent rejoin without a new invite.
- Determinism: Admin warp endpoint and weekly sim_report snapshots for reproducibility.
- CI: Coverage gate initially at 80%; will ratchet to 95%. Testnet-only gate and determinism checks included.

- TVC uses a backend bridge (Express) to integrate with Sequence Theory Supabase functions. This provides request signing, rate limiting, CORS control, and a stable response envelope.
- MVP implements full simulation with precise math and state; Amoy testnet wiring will be added later behind feature flags.
- Enforce testnet-first (Polygon Amoy, chainId 80002) across configs and CI.
- Wallet binding: TVC only honors the ST-issued wallet returned from backend auth; MetaMask is disabled in the frontend.
- Invite/share links use short-lived invite tokens rather than raw IDs.
- Security: HMAC request signing for mutating endpoints, per-IP and per-user rate limits, CSRF protection, and strict CORS.
- Deposit split in Phase 1 is fixed at 10/60/30 (Strand1/2/3); RRL equations are locked to the white paper matrix and validated against golden vectors.
- Penalties: On every 3rd missed deposit, apply –3% to member shareWeight; surfaced via API and UI.
- Phase-2 triggers: 50% lockup elapsed or TVL ≥ $2,000,000; DCA USD per rigor (light: $1k, medium: $5k, heavy: $10k); migrate 5–10% weekly from Strands 2&3 depending on rigor.
- Emergency: pause blocks mutators; emergency withdraw returns net deposits only.
- Observability: structured logs and “Sim Epoch Report” snapshots; basic admin summary for last 8 epochs.
- Time-warp endpoint to advance deterministic epochs; determinism asserted in CI via snapshot hash.
