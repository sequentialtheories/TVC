// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMegaVault {
    // Enums
    enum Phase { PHASE_1, PHASE_2 }
    
    // Events
    event DepositReceived(address indexed subClub, uint256 amount);
    event HarvestExecuted(uint256 totalProfits, uint256 timestamp);
    event PhaseTransitioned(Phase newPhase);
    event StrandRebalanced(uint256 strandId, uint256 newAllocation);
    event ProfitsDistributed(uint256 amount);
    event WithdrawalMade(address indexed member, uint256 amount);
    
    // Structs
    struct VaultState {
        uint256 totalDeposits;
        uint256 totalValue;
        Phase currentPhase;
        uint256 lastHarvestTime;
        uint256 harvestCount;
        bool isPaused;
    }
    
    struct StrandAllocation {
        uint256 capitalStrand;    // 10%
        uint256 yieldStrand;      // 60%
        uint256 momentumStrand;   // 30%
        uint256 bitcoinStrand;    // Phase 2 only
    }
    
    // Core Functions
    function deposit(uint256 amount) external;
    function executeHarvest() external;
    function transitionToPhase2() external;
    function rebalanceStrands() external;
    function receiveDeposit(address subClub, uint256 amount) external;
    function processEmergencyWithdrawal(address subClub, address member, uint256 amount) external;
    function requestPhase2Transition(address subClub) external;
    
    // View Functions
    function getVaultState() external view returns (VaultState memory);
    function getCurrentAllocation() external view returns (StrandAllocation memory);
    function getStrandValue(uint256 strandId) external view returns (uint256);
    function getTotalValue() external view returns (uint256);
    function getPhase() external view returns (Phase);
    function canHarvest() external view returns (bool);
    function shouldTransitionPhase2() external view returns (bool);
    
    // Integration Functions
    function registerSubClub(address subClub) external;
    function removeSubClub(address subClub) external;
    function getRegisteredSubClubs() external view returns (address[] memory);
    
    // Admin Functions
    function emergencyPause() external;
    function emergencyUnpause() external;
    function emergencyWithdraw(address token, uint256 amount) external;
}
