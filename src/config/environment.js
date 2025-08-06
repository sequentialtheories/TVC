
export const config = {
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL || 'https://qldjhlnsphlixmzzrdwi.supabase.co/functions/v1',
  VAULT_CLUB_API_KEY: process.env.REACT_APP_VAULT_CLUB_API_KEY || '',
  
  ST_AUTH_URL: process.env.REACT_APP_ST_AUTH_URL || 'https://sequencetheory.com/auth',
  ST_API_AUTH: process.env.REACT_APP_ST_API_AUTH || 'https://api.sequencetheory.com/auth',
  ST_GRAPHQL: process.env.REACT_APP_ST_GRAPHQL || 'https://api.sequencetheory.com/graphql',
  ST_WALLET_REGISTRY: process.env.REACT_APP_ST_WALLET_REGISTRY || 'https://api.sequencetheory.com/wallet-map',
  
  POLYGON_RPC: process.env.REACT_APP_POLYGON_RPC || 'https://polygon-mainnet.g.alchemy.com/v2/your-key',
  USDC_ADDRESS: process.env.REACT_APP_USDC_ADDRESS || '0xA0b86a33E6441b8435b662f0E2d0c2837b0b3c0f',
  VAULT_CONTRACT_ADDRESS: process.env.REACT_APP_VAULT_CONTRACT_ADDRESS || '',
  
  ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
  
  RATE_LIMIT_REQUESTS: 5,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_DEPOSIT_AMOUNT: 1000000,
  MIN_DEPOSIT_AMOUNT: 0.01
};

export const validateConfig = () => {
  const requiredVars = [
    'VAULT_CLUB_API_KEY',
    'VAULT_CONTRACT_ADDRESS'
  ];
  
  const missing = requiredVars.filter(key => !config[key.replace('REACT_APP_', '')]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (config.ENVIRONMENT === 'production' && config.DEBUG) {
    console.warn('Debug mode is enabled in production environment');
  }
};

if (typeof window !== 'undefined') {
  try {
    validateConfig();
  } catch (error) {
    console.error('Configuration validation failed:', error.message);
  }
}
