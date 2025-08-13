# Decisions

- TVC uses a backend bridge (Express) to integrate with Sequence Theory Supabase functions. This provides request signing, rate limiting, CORS control, and a stable response envelope.
- MVP implements full simulation with precise math and state; Amoy testnet wiring will be added later behind feature flags.
- Enforce testnet-first (Polygon Amoy, chainId 80002) across configs and CI.
- Wallet binding: TVC only honors the ST-issued wallet returned from backend auth; MetaMask is disabled in the frontend.
- Invite/share links use short-lived invite tokens rather than raw IDs.
- Security: HMAC request signing for mutating endpoints, per-IP and per-user rate limits, CSRF protection, and strict CORS.
