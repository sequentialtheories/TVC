#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔍 Validating TVC secrets configuration..."

if [ -f "$PROJECT_ROOT/.env" ]; then
    source "$PROJECT_ROOT/.env"
    echo "✅ Environment file loaded"
else
    echo "⚠️  No .env file found, checking system environment"
fi

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
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
)

echo ""
echo "📋 Checking required variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ $var is set"
    else
        echo "❌ $var is missing"
        exit 1
    fi
done

echo ""
echo "📋 Checking optional variables..."
for var in "${OPTIONAL_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ $var is set"
    else
        echo "⚠️  $var is not set (optional)"
    fi
done

echo ""
echo "🔒 Security checks..."

if [ -n "$JWT_SECRET" ]; then
    if [ ${#JWT_SECRET} -ge 32 ]; then
        echo "✅ JWT_SECRET has adequate length"
    else
        echo "⚠️  JWT_SECRET should be at least 32 characters"
    fi
fi

if [ -n "$VAULT_CONTRACT_ADDRESS" ]; then
    if [[ $VAULT_CONTRACT_ADDRESS =~ ^0x[a-fA-F0-9]{40}$ ]]; then
        echo "✅ VAULT_CONTRACT_ADDRESS has valid format"
    else
        echo "⚠️  VAULT_CONTRACT_ADDRESS should be a valid Ethereum address"
    fi
fi

if [ -n "$CHAIN_ID" ]; then
    if [ "$CHAIN_ID" = "80002" ]; then
        echo "✅ CHAIN_ID set to testnet (Polygon Amoy)"
    elif [ "$CHAIN_ID" = "137" ]; then
        echo "⚠️  CHAIN_ID set to mainnet (Polygon) - ensure this is intentional"
    else
        echo "ℹ️  CHAIN_ID set to $CHAIN_ID"
    fi
fi

PLACEHOLDER_PATTERNS=("your_" "example_" "placeholder_" "changeme" "TODO" "0xYourVaultContractAddressHere")
for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
    if grep -q "$pattern" "$PROJECT_ROOT/.env" 2>/dev/null; then
        echo "⚠️  Found placeholder values in .env file - please update with real values"
        break
    fi
done

echo ""
echo "🎉 TVC secrets validation completed!"
echo ""
echo "💡 Next steps:"
echo "1. If any tests failed, update the corresponding secrets"
echo "2. Test your application to ensure wallet connection works"
echo "3. Deploy updated secrets to production environment"
echo "4. Test vault operations with new configuration"
