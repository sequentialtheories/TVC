export const NETWORKS = {
  POLYGON_AMOY: {
    chainId: '0x13882',
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    blockExplorer: 'https://amoy.polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
  }
};

export const VAULT_CONTRACT_ADDRESS = "0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5e";
export const VAULT_CONTRACT_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function deposit(uint256 amount) external payable",
  "function harvestAndRoute() external",
  "function getTotalMembers() view returns (uint256)",
  "function getMemberInfo(address) view returns (uint256, uint256, bool)",
  "function getVaultStats() view returns (uint256, uint256, uint256, uint256)",
  "function withdraw(uint256 amount) external",
  "function emergencyWithdraw() external",
  "function pause() external",
  "function unpause() external",
  "function getCurrentPhase() view returns (uint8)",
  "function getStrandAllocation(uint8) view returns (uint256)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

export const USDC_ADDRESS = "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582";
