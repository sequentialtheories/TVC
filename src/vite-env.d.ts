
interface ImportMetaEnv {
  readonly VITE_TVC_API_BASE: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DISABLE_METAMASK: string
  readonly FEATURE_TESTNET_ONLY: string
  readonly SIMULATION_MODE: string
  readonly CHAIN_ID: string
  readonly VAULT_CONTRACT_ADDRESS: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string
  readonly VITE_INFURA_API_KEY: string
  readonly VITE_VAULT_CLUB_API_KEY: string
  readonly VITE_APP_ENV: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_USE_MOCK_DATA: string
  readonly VITE_MOCK_VAULT_BALANCE: string
  readonly VITE_MOCK_MEMBER_COUNT: string
  readonly JWT_SECRET: string
  readonly SIGNING_SECRET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>
    on: (event: string, callback: (...args: any[]) => void) => void
    removeListener: (event: string, callback: (...args: any[]) => void) => void
  }
}
