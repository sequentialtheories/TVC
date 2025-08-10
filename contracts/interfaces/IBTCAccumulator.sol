// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IBTCAccumulator {
    // Events
    event BTCPurchased(uint256 usdAmount, uint256 btcAmount, uint256 price);
    event DCAExecuted(uint256 weeklyAmount, uint256 btcReceived);
    event AccumulationCompleted(uint256 totalBTC, uint256 totalUSD);
    event PriceOracleUpdated(address newOracle);
    event EmergencyWithdrawal(uint256 btcAmount, address recipient);
    
    // Structs
    struct AccumulationState {
        uint256 totalUSDInvested;
        uint256 totalBTCAccumulated;
        uint256 averageBuyPrice;
        uint256 weeklyDCAAmount;
        uint256 lastPurchaseTime;
        uint256 purchaseCount;
        bool isActive;
    }
    
    struct PriceData {
        uint256 currentPrice;
        uint256 lastUpdateTime;
        address oracle;
        bool isValid;
    }
    
    // Core Functions
    function executeDCA(uint256 usdAmount) external;
    function purchaseBTC(uint256 usdAmount) external returns (uint256 btcReceived);
    function completeAccumulation() external;
    function withdrawBTC(uint256 amount, address recipient) external;
    
    // View Functions
    function getAccumulationState() external view returns (AccumulationState memory);
    function getCurrentBTCPrice() external view returns (uint256);
    function getPriceData() external view returns (PriceData memory);
    function getTotalValue() external view returns (uint256);
    function canExecuteDCA() external view returns (bool);
    function getNextDCATime() external view returns (uint256);
    function getProfits() external view returns (uint256);
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    
    // Configuration Functions
    function setWeeklyDCAAmount(uint256 amount) external;
    function updatePriceOracle(address newOracle) external;
    function setPriceThreshold(uint256 threshold) external;
    
    // Integration Functions
    function notifyPhaseTransition() external;
    function requestBTCBalance() external view returns (uint256);
    function validatePurchase(uint256 usdAmount) external view returns (bool);
    
    // Emergency Functions
    function emergencyPause() external;
    function emergencyUnpause() external;
    function emergencyWithdraw(uint256 amount) external;
}
