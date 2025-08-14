Secrets rotation policy

Scope:
- API keys (external providers)
- Supabase keys (Service Role, anon, Edge Function key)
- Signing secrets
- JWT settings

Policy:
- Rotate quarterly or upon incident.
- Never log secrets. Redact first 4 / last 4 if absolutely necessary.

Rotation steps:
1) Prepare new key B in secret manager.
2) Deploy configuration using key B to all environments.
3) Verify health checks and critical flows.
4) Revoke old key A.
5) Audit logs and access.

Rollback:
- If any issue arises after step 2, revert to key A and re-deploy.
- Maintain a grace window during rotation where both keys remain valid until verification passes.

Operational notes:
- Scripts must exit with non-zero status if required envs are missing.
- Scripts must never echo secret values.
