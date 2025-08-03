// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRRLEngine {
    // Events
    event RRLCalculationExecuted(
        uint256 totalProfits,
        uint256[] strandAllocations,
        uint256 timestamp
    );
    event ParametersUpdated(
        uint256 capitalWeight,
        uint256 yieldWeight,
        uint256 momentumWeight
    );
    event PhaseTransitionTriggered(uint256 completionPercentage);
    
    // Structs
    struct RRLParameters {
        uint256 capitalWeight;      // 10% default
        uint256 yieldWeight;        // 60% default  
        uint256 momentumWeight;     // 30% default
        uint256 rebalanceThreshold; // 5% default
        uint256 harvestInterval;    // 168 hours (1 week)
    }
    
    struct StrandPerformance {
        uint256 strandId;
        uint256 currentValue;
        uint256 targetValue;
        uint256 actualAPY;
        uint256 targetAPY;
        uint256 performanceRatio;
    }
    
    struct RRLResult {
        uint256[] newAllocations;
        uint256 totalReallocation;
        bool requiresRebalance;
        uint256 expectedYield;
        uint256 riskScore;
    }
    
    // Core Functions
    function executeRRL(
        uint256 totalProfits,
        StrandPerformance[] calldata strandData
    ) external returns (RRLResult memory);
    
    function calculateOptimalAllocation(
        StrandPerformance[] calldata strandData
    ) external view returns (uint256[] memory);
    
    function shouldRebalance(
        StrandPerformance[] calldata strandData
    ) external view returns (bool);
    
    function shouldTransitionPhase2(
        uint256 currentValue,
        uint256 targetValue,
        uint256 timeElapsed
    ) external view returns (bool);
    
    // View Functions
    function getRRLParameters() external view returns (RRLParameters memory);
    function getLastExecutionTime() external view returns (uint256);
    function getExecutionCount() external view returns (uint256);
    function canExecute() external view returns (bool);
    
    // Configuration Functions
    function updateParameters(
        uint256 capitalWeight,
        uint256 yieldWeight,
        uint256 momentumWeight
    ) external;
    
    function setRebalanceThreshold(uint256 threshold) external;
    function setHarvestInterval(uint256 interval) external;
    
    // Calculation Helpers
    function calculatePerformanceRatio(
        uint256 actualAPY,
        uint256 targetAPY
    ) external pure returns (uint256);
    
    function calculateRiskScore(
        StrandPerformance[] calldata strandData
    ) external pure returns (uint256);
}
