// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStrandManager {
    // Enums
    enum StrandType { CAPITAL, YIELD, MOMENTUM }
    
    // Events
    event FundsDeployed(uint256 amount, address indexed protocol);
    event FundsWithdrawn(uint256 amount, address indexed protocol);
    event YieldHarvested(uint256 amount);
    event StrategyUpdated(address newStrategy);
    event EmergencyWithdrawal(uint256 amount);
    
    // Structs
    struct StrandInfo {
        StrandType strandType;
        uint256 totalDeployed;
        uint256 currentValue;
        uint256 targetAPY;
        uint256 actualAPY;
        address primaryProtocol;
        bool isActive;
    }
    
    struct PerformanceMetrics {
        uint256 totalReturns;
        uint256 totalFees;
        uint256 netYield;
        uint256 lastUpdateTime;
        uint256 averageAPY;
    }
    
    // Core Functions
    function deployFunds(uint256 amount) external;
    function withdrawFunds(uint256 amount) external;
    function harvestYield() external returns (uint256);
    function rebalance() external;
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    
    // View Functions
    function getStrandInfo() external view returns (StrandInfo memory);
    function getPerformanceMetrics() external view returns (PerformanceMetrics memory);
    function getCurrentValue() external view returns (uint256);
    function getTotalValue() external view returns (uint256);
    function getAvailableYield() external view returns (uint256);
    function getTargetAllocation() external view returns (uint256);
    function getProfits() external view returns (uint256);
    
    // Strategy Functions
    function updateStrategy(address newStrategy) external;
    function getStrategy() external view returns (address);
    function validateStrategy(address strategy) external view returns (bool);
    
    // Emergency Functions
    function emergencyWithdraw() external;
    function emergencyPause() external;
    function emergencyUnpause() external;
    
    // Integration Functions
    function notifyRebalance(uint256 newAllocation) external;
    function requestYieldData() external view returns (uint256, uint256);
}
