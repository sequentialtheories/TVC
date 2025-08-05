// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISubClub {
    // Enums
    enum RigorLevel { LIGHT, MEDIUM, HEAVY }
    enum Phase { PHASE_1, PHASE_2 }
    
    // Events
    event SubClubCreated(address[] members, uint256 lockPeriod, RigorLevel rigor);
    event DepositMade(address indexed member, uint256 amount, uint256 week);
    event WithdrawalMade(address indexed member, uint256 amount);
    event EmergencyWithdrawal(address indexed member, uint256 depositsOnly);
    event PhaseTransition(Phase newPhase);
    event Phase2Triggered(uint256 timestamp);
    event ContractCompleted();
    event MemberPenalized(address indexed member, uint256 newSharePercentage);
    event PenaltyApplied(address indexed member, uint256 penaltyAmount, uint256 missedDeposits);
    event ProfitDistributed(address indexed member, uint256 amount);
    
    // Structs
    struct MemberInfo {
        uint256 totalDeposited;
        uint256 sharePercentage;
        uint256 missedDeposits;
        uint256 lastDepositWeek;
        bool isActive;
        uint256 joinedAt;
    }
    
    struct ContractInfo {
        address[] members;
        uint256 lockPeriod;
        RigorLevel rigor;
        uint256 weeklyAmount;
        bool isCharged;
        uint256 startTime;
        Phase currentPhase;
        bool isCompleted;
        uint256 totalValue;
    }
    
    // Core Functions
    function makeDeposit() external;
    function emergencyWithdraw() external;
    function processMissedDeposits() external;
    function triggerPhase2() external;
    function distributeProfits(uint256 totalProfits) external;
    
    // View Functions
    function getMemberInfo(address member) external view returns (MemberInfo memory);
    function getContractInfo() external view returns (ContractInfo memory);
    function getCurrentWeek() external view returns (uint256);
    function canMakeDeposit(address member) external view returns (bool);
    function getAllMembers() external view returns (address[] memory);
    function shouldTriggerPhase2() external view returns (bool);
    
}
