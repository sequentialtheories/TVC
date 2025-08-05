export const CONTRACT_ADDRESSES = {
  amoy: {
    factory: "0xA13ac45069a1a1Cd588776f5824bbf893EBa980e",
    megaVault: "0x6C19DF9bb8C05630A5405987b16EAEc2f2Eed4E9",
    emergencyModule: "0x86ca532961Eca50B61f7A2766bb9d91E403f79BA",
    strand1: "0x4d2E7dbb67bB82E3f6e8aDF920588932ED7d5d42",
    strand2: "0xf8466c6af264DDA1c5b4EEcDAE416Fd708DeB3e7",
    strand3: "0x7646c34d7C904c6A62d0FC46199d9363E34aD38D",
    rrlEngine: "0x41B06B936c67b22b8559973B885eF1c7778c39C5",
    btcAccumulator: "0xfdD2AD07e7C7314B1FB0ebb3C6d0A3d1D304CA83",
    lender: "0x73CC7F40c47b9735183b0E19c41F08aE47648549",
    mockAavePool: "0x6C56d2f9A1a139E2EdB04B0875E7e1cc3d4E3684",
    mockQuickSwapRouter: "0x877036E4679f49bF012A968ee3dd3f678Bd1Ef87",
    mockWBTC: "0xcfdA8DD5A33B5BCA870dc7252a540197b65afe4C"
  }
}

export const VAULT_CONTRACT_ABI = [
  "function deposit(uint256 amount) external",
  "function executeHarvest() external",
  "function transitionToPhase2() external",
  "function rebalanceStrands() external",
  "function receiveDeposit(address subClub, uint256 amount) external",
  "function processEmergencyWithdrawal(address subClub, address member, uint256 amount) external",
  "function requestPhase2Transition(address subClub) external",
  "function getVaultState() external view returns (tuple(uint256 totalDeposits, uint256 totalValue, uint8 currentPhase, uint256 lastHarvestTime, uint256 harvestCount, bool isPaused))",
  "function getCurrentAllocation() external view returns (tuple(uint256 capitalStrand, uint256 yieldStrand, uint256 momentumStrand, uint256 bitcoinStrand))",
  "function getStrandValue(uint256 strandId) external view returns (uint256)",
  "function getTotalValue() external view returns (uint256)",
  "function getPhase() external view returns (uint8)",
  "function canHarvest() external view returns (bool)",
  "function shouldTransitionPhase2() external view returns (bool)",
  "function registerSubClub(address subClub) external",
  "function removeSubClub(address subClub) external",
  "function getRegisteredSubClubs() external view returns (address[])",
  "function balanceOf(address) view returns (uint256)",
  "function getTotalMembers() view returns (uint256)",
  "function getMemberInfo(address) view returns (uint256, uint256, bool)",
  "function getVaultStats() view returns (uint256, uint256, uint256, uint256)"
]

export const SUBCLUB_FACTORY_ABI = [
  "function createSubClub(address[] memory members, uint256 lockPeriod, uint8 rigor, bool isCharged) external returns (address)",
  "function getSubClubsForMember(address member) external view returns (address[] memory)",
  "function getAllSubClubs() external view returns (address[] memory)",
  "function isValidSubClub(address subClub) external view returns (bool)"
]

export const SUBCLUB_ABI = [
  "function makeDeposit() external",
  "function emergencyWithdraw() external",
  "function processMissedDeposits() external",
  "function triggerPhase2() external",
  "function distributeProfits(uint256 totalProfits) external",
  "function getMemberInfo(address member) external view returns (tuple(uint256 totalDeposited, uint256 sharePercentage, uint256 missedDeposits, uint256 lastDepositWeek, bool isActive, uint256 joinedAt))",
  "function getContractInfo() external view returns (tuple(address[] members, uint256 lockPeriod, uint8 rigor, uint256 weeklyAmount, bool isCharged, uint256 startTime, uint8 currentPhase, bool isCompleted, uint256 totalValue))",
  "function getCurrentWeek() external view returns (uint256)",
  "function canMakeDeposit(address member) external view returns (bool)",
  "function getAllMembers() external view returns (address[] memory)",
  "function shouldTriggerPhase2() external view returns (bool)"
]

export const EMERGENCY_MODULE_ABI = [
  "function requestEmergencyWithdraw(address subClub) external",
  "function pauseContract(address target) external",
  "function unpauseContract(address target) external",
  "function getEmergencyStatus(address subClub) external view returns (bool, uint256, address[])"
]

export const RIGOR_LEVELS = {
  0: 'Light',
  1: 'Medium', 
  2: 'Heavy',
  3: 'Custom'
}

export const PHASE_NAMES = {
  1: 'Phase 1: Diversified Growth',
  2: 'Phase 2: BTC Accumulation'
}

export const NETWORK_CONFIG = {
  amoy: {
    chainId: '0x13882',
    chainName: 'Polygon Amoy Testnet',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://rpc-amoy.polygon.technology/'],
    blockExplorerUrls: ['https://amoy.polygonscan.com/']
  }
}
