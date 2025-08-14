Frontend (Session B) integration notes

- Set frontend env:
  - VITE_TVC_API_BASE=http://localhost:4000
  - VITE_DISABLE_METAMASK=1
- Sign-in flow:
  - Preferred: POST /auth/login with body { stAccessToken } or Authorization: Bearer &lt;ST_TOKEN&gt;
  - Optional dev convenience: visit with /#token=&lt;ST_TOKEN&gt;; the app redeems it immediately and clears the fragment
- Invite flow:
  - While signed in, visit /?join=&lt;INVITE_TOKEN&gt; to join via POST /vault/join; on success/failure the URL is cleaned with history.replaceState
- UX:
  - Header shows the ST wallet (short) and chain 80002 when logged in
  - Logout button calls /auth/logout and clears FE session state
- Security:
  - All fetches use credentials: 'include' and surface backend x-request-id in errors
  - No MetaMask prompts when VITE_DISABLE_METAMASK=1 or when runtime /config disables it

# TVC

Frontend (Session B) integration notes

- Set frontend env:
  - VITE_TVC_API_BASE=http://localhost:4000
  - VITE_DISABLE_METAMASK=1
- Sign-in flow:
  - Preferred: POST /auth/login with body { stAccessToken } or Authorization: Bearer <ST_TOKEN>
  - Optional dev convenience: visit with /#token=<ST_TOKEN>; the app redeems it immediately and clears the fragment
- Invite flow:
  - While signed in, visit /?join=&lt;INVITE_TOKEN&gt; to join via POST /vault/join; invite tokens are single-use and invalid/expired states are surfaced via alerts; after handling, the URL is cleaned with history.replaceState
- UX:
  - Header shows the ST wallet (short) and chain 80002 when logged in
  - Logout button calls /auth/logout and clears FE session state
- Security:
  - All fetches use credentials: 'include' and surface backend x-request-id in errors
  - No MetaMask prompts when VITE_DISABLE_METAMASK=1 or when runtime /config disables it

# TVC
