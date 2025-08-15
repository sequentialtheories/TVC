interface FeatureFlags {
  SIMULATION_MODE: boolean;
  DISABLE_METAMASK: boolean;
  TESTNET_ONLY: boolean;
  DEBUG_MODE: boolean;
}

interface AppConfig {
  tvcApiBase: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  chainId: number;
  vaultContractAddress: string;
  walletConnectProjectId: string;
  infuraApiKey: string;
  vaultClubApiKey: string;
  appEnv: string;
  useMockData: boolean;
  mockVaultBalance: string;
  mockMemberCount: number;
  featureFlags: FeatureFlags;
}

class ConfigService {
  private config: AppConfig;
  private featureFlagsCache: FeatureFlags | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 30000;

  constructor() {
    this.config = this.loadEnvironmentConfig();
  }

  private loadEnvironmentConfig(): AppConfig {
    return {
      tvcApiBase: import.meta.env.VITE_TVC_API_BASE || '',
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
      supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      chainId: parseInt(import.meta.env.CHAIN_ID || '80002'),
      vaultContractAddress: import.meta.env.VAULT_CONTRACT_ADDRESS || '0xYourVaultContractAddressHere',
      walletConnectProjectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '',
      infuraApiKey: import.meta.env.VITE_INFURA_API_KEY || '',
      vaultClubApiKey: import.meta.env.VITE_VAULT_CLUB_API_KEY || '',
      appEnv: import.meta.env.VITE_APP_ENV || 'development',
      useMockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
      mockVaultBalance: import.meta.env.VITE_MOCK_VAULT_BALANCE || '1000',
      mockMemberCount: parseInt(import.meta.env.VITE_MOCK_MEMBER_COUNT || '42'),
      featureFlags: {
        SIMULATION_MODE: import.meta.env.SIMULATION_MODE === '1' || import.meta.env.SIMULATION_MODE === 'true',
        DISABLE_METAMASK: import.meta.env.VITE_DISABLE_METAMASK === '1' || import.meta.env.VITE_DISABLE_METAMASK === 'true',
        TESTNET_ONLY: import.meta.env.FEATURE_TESTNET_ONLY === '1' || import.meta.env.FEATURE_TESTNET_ONLY === 'true',
        DEBUG_MODE: import.meta.env.VITE_DEBUG_MODE === 'true'
      }
    };
  }

  private async fetchRuntimeFeatureFlags(): Promise<FeatureFlags> {
    try {
      if (!this.config.tvcApiBase) {
        return this.config.featureFlags;
      }

      const response = await fetch(`${this.config.tvcApiBase}/config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          SIMULATION_MODE: data.SIMULATION_MODE ?? this.config.featureFlags.SIMULATION_MODE,
          DISABLE_METAMASK: data.DISABLE_METAMASK ?? this.config.featureFlags.DISABLE_METAMASK,
          TESTNET_ONLY: data.TESTNET_ONLY ?? this.config.featureFlags.TESTNET_ONLY,
          DEBUG_MODE: data.DEBUG_MODE ?? this.config.featureFlags.DEBUG_MODE
        };
      }
    } catch (error) {
      console.warn('Failed to fetch runtime feature flags, using environment defaults');
    }

    return this.config.featureFlags;
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    const now = Date.now();
    
    if (!this.featureFlagsCache || (now - this.lastFetchTime) > this.CACHE_DURATION) {
      this.featureFlagsCache = await this.fetchRuntimeFeatureFlags();
      this.lastFetchTime = now;
    }

    return this.featureFlagsCache;
  }

  async getConfig(): Promise<AppConfig> {
    const flags = await this.getFeatureFlags();
    return { ...this.config, featureFlags: flags };
  }

  getTvcApiBase(): string {
    return this.config.tvcApiBase;
  }

  getChainId(): number {
    return this.config.chainId;
  }

  getVaultContractAddress(): string {
    return this.config.vaultContractAddress;
  }

  async isSimulationMode(): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    return flags.SIMULATION_MODE;
  }

  async isMetaMaskDisabled(): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    return flags.DISABLE_METAMASK;
  }

  async isTestnetOnly(): Promise<boolean> {
    const flags = await this.getFeatureFlags();
    return flags.TESTNET_ONLY;
  }
}

export const configService = new ConfigService();
export type { FeatureFlags, AppConfig };
