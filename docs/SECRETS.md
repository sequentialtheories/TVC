# Secrets Management - TVC

This document outlines the procedures for managing sensitive credentials and API keys in The Vault Club (TVC) project.

## Overview

All secrets must be rotated regularly and never committed to version control. This document provides step-by-step procedures for rotating each type of secret used in the TVC system.

## Secret Types

### 1. Vault Club API Keys

**Location**: Environment variable `VITE_VAULT_CLUB_API_KEY`

**Rotation Procedure**:
1. Access vault club management interface
2. Generate new API key
3. Update environment variable in all environments
4. Test vault operations and balance queries
5. Revoke old key after verification

**Emergency Rotation**: If compromised, revoke immediately and update all environments within 30 minutes.

### 2. Wallet Connect Project ID

**Location**: Environment variable `VITE_WALLET_CONNECT_PROJECT_ID`

**Rotation Procedure**:
1. Log into WalletConnect Cloud dashboard
2. Create new project or regenerate project ID
3. Update environment variable
4. Test wallet connection functionality
5. Deactivate old project ID

### 3. Infura API Keys

**Location**: Environment variable `VITE_INFURA_API_KEY`

**Rotation Procedure**:
1. Log into Infura dashboard
2. Generate new API key
3. Update environment variable
4. Test blockchain connectivity
5. Delete old API key

### 4. Smart Contract Addresses

**Location**: Environment variable `VAULT_CONTRACT_ADDRESS`

**Rotation Procedure**:
1. Deploy new contract version (if needed)
2. Update contract address in environment
3. Test all contract interactions
4. Update frontend to use new contract
5. Migrate user data if necessary

**Emergency Rotation**: In case of contract compromise, deploy emergency pause contract and redirect all operations.

### 5. JWT Signing Secrets

**Location**: Environment variable `JWT_SECRET`

**Rotation Procedure**:
1. Generate new cryptographically secure secret (minimum 256 bits)
2. Update environment variable
3. Implement gradual rollover to maintain session validity
4. Monitor for authentication errors
5. Complete rollover after 7 days

**Emergency Rotation**: Immediate rotation will invalidate all user sessions.

## Rotation Scripts

### Automated Rotation Script

```bash
#!/bin/bash
# scripts/rotate-secrets.sh

set -e

echo "Starting TVC secrets rotation..."

# Backup current environment
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Function to update environment variable
update_env_var() {
    local key=$1
    local value=$2
    
    if grep -q "^${key}=" .env; then
        sed -i "s/^${key}=.*/${key}=${value}/" .env
    else
        echo "${key}=${value}" >> .env
    fi
}

# Rotate JWT secret
echo "Rotating JWT secret..."
NEW_JWT_SECRET=$(openssl rand -hex 32)
update_env_var "JWT_SECRET" "$NEW_JWT_SECRET"

# Rotate signing secret
echo "Rotating signing secret..."
NEW_SIGNING_SECRET=$(openssl rand -hex 32)
update_env_var "SIGNING_SECRET" "$NEW_SIGNING_SECRET"

echo "TVC secrets rotation completed. Please update external service keys manually."
echo "Backup saved as .env.backup.$(date +%Y%m%d_%H%M%S)"
```

### Validation Script

```bash
#!/bin/bash
# scripts/validate-secrets.sh

set -e

echo "Validating TVC secrets configuration..."

# Check required environment variables
REQUIRED_VARS=(
    "VITE_TVC_API_BASE"
    "CHAIN_ID"
    "VAULT_CONTRACT_ADDRESS"
)

OPTIONAL_VARS=(
    "VITE_VAULT_CLUB_API_KEY"
    "VITE_WALLET_CONNECT_PROJECT_ID"
    "VITE_INFURA_API_KEY"
    "JWT_SECRET"
    "SIGNING_SECRET"
)

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set"
        exit 1
    fi
done

echo "All required secrets validated successfully"
```

## Security Policies

### Never Log Sensitive Data

- All logging must use the centralized logger that automatically redacts sensitive data
- Console.log statements containing wallet addresses, private keys, or API keys are prohibited
- Error messages must not expose contract addresses or API keys in production

### Token Patterns to Redact

The following patterns are automatically redacted in logs:
- Ethereum addresses: `0x[a-fA-F0-9]{40}`
- JWT tokens: `eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`
- API keys starting with: `st_`, `sk_`, `pk_`
- Any field containing: `api_key`, `token`, `secret`, `password`, `address`, `wallet`

### Emergency Procedures

**If secrets are compromised**:

1. **Immediate Response** (within 15 minutes):
   - Pause all vault operations if possible
   - Revoke compromised API keys
   - Deploy emergency configuration

2. **Short-term Response** (within 1 hour):
   - Rotate all related secrets
   - Review transaction logs for suspicious activity
   - Notify vault members if necessary

3. **Long-term Response** (within 24 hours):
   - Conduct security audit
   - Update incident response procedures
   - Consider contract migration if needed

## Monitoring

- Set up alerts for unusual vault activity
- Monitor API usage patterns for anomalies
- Regular security audits of secret usage
- Automated scanning for secrets in code repositories

## Compliance

- Secrets must be rotated every 90 days minimum
- All secret access must be logged and auditable
- Secrets must never be transmitted over unencrypted channels
- Development and production secrets must be completely separate
- Smart contract interactions must be audited before deployment

---

*This document should be reviewed and updated quarterly or after any security incident.*
