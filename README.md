# The Vault Club (TVC)

A decentralized investment platform that integrates with Sequence Theory for unified authentication and contract management.

## Features

- **Unified Authentication**: Seamless SSO with Sequence Theory platform
- **Real Contract Integration**: Smart contracts deployed on Polygon Amoy testnet
- **DeFi Integration**: Real-time data from AAVE, QuickSwap, and other protocols
- **Wallet Integration**: MetaMask support with automatic network switching
- **Investment Management**: Create and join investment subclubs with real blockchain interactions

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update the `.env` file with your API keys and configuration.

4. Start the development server:
```bash
npm run dev
```

## Smart Contract Deployment

1. Compile contracts:
```bash
npm run compile
```

2. Deploy to Polygon Amoy testnet:
```bash
npm run deploy
```

3. Update the `VAULT_CONTRACT_ADDRESS` in `src/config/contracts.js` with the deployed address.

## Environment Variables

- `REACT_APP_VAULT_CLUB_API_KEY`: API key for Sequence Theory integration
- `REACT_APP_SUPABASE_URL`: Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Supabase anonymous key
- `PRIVATE_KEY`: Wallet private key for contract deployment

## Integration with Sequence Theory

This frontend integrates with the Sequence Theory backend for:
- User account creation and authentication
- Contract management and storage
- Unified session management across domains

## Testing

The application supports end-to-end testing of:
- Account creation via TVC frontend
- Authentication sync with Sequence Theory
- Real blockchain interactions on Polygon Amoy
- Contract creation and management
