#!/bin/bash

echo "🚀 Testing The Vault Club API"
echo "================================"

echo "1. Testing health endpoint..."
curl -s http://localhost:3001/api/health | jq '.' || echo "Health endpoint failed"

echo -e "\n2. Testing user registration..."
curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","walletAddress":"0x742d35Cc6634C0532925a3b8D4C9db96C4b4d4d4"}' | jq '.' || echo "Registration failed"

echo -e "\n3. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}')

echo $LOGIN_RESPONSE | jq '.'

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ ! -z "$TOKEN" ]; then
  echo -e "\n4. Testing token verification..."
  curl -s -X GET http://localhost:3001/api/auth/verify \
    -H "Authorization: Bearer $TOKEN" | jq '.' || echo "Token verification failed"

  echo -e "\n5. Testing user profile..."
  curl -s -X GET http://localhost:3001/api/users/profile \
    -H "Authorization: Bearer $TOKEN" | jq '.' || echo "Profile fetch failed"

  echo -e "\n6. Testing wallet endpoints..."
  curl -s -X GET http://localhost:3001/api/wallets/user-wallets \
    -H "Authorization: Bearer $TOKEN" | jq '.' || echo "Wallet fetch failed"
else
  echo "No token received, skipping authenticated tests"
fi

echo -e "\n✅ API testing complete!"
