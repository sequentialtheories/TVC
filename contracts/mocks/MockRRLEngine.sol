// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRRLEngine.sol";

contract MockRRLEngine is IRRLEngine {
    RRLParameters private _parameters;
    uint256 private _lastExecutionTime;
    uint256 private _executionCount;
    
    constructor() {
        _parameters = RRLParameters({
            capitalWeight: 1000,    // 10%
            yieldWeight: 6000,      // 60%
            momentumWeight: 3000,   // 30%
            rebalanceThreshold: 500, // 5%
            harvestInterval: 168 hours
        });
    }
    
    function executeRRL(
        uint256 totalProfits,
        StrandPerformance[] calldata strandData
    ) external override returns (RRLResult memory) {
        _lastExecutionTime = block.timestamp;
        _executionCount++;
        
        uint256[] memory newAllocations = new uint256[](3);
        newAllocations[0] = 1000; // 10%
        newAllocations[1] = 6000; // 60%
        newAllocations[2] = 3000; // 30%
        
        return RRLResult({
            newAllocations: newAllocations,
            totalReallocation: totalProfits,
            requiresRebalance: false,
            expectedYield: totalProfits / 10,
            riskScore: 5000
        });
    }
    
    function calculateOptimalAllocation(
        StrandPerformance[] calldata strandData
    ) external view override returns (uint256[] memory) {
        uint256[] memory allocations = new uint256[](3);
        allocations[0] = 1000; // 10%
        allocations[1] = 6000; // 60%
        allocations[2] = 3000; // 30%
        return allocations;
    }
    
    function shouldRebalance(
        StrandPerformance[] calldata strandData
    ) external view override returns (bool) {
        return false;
    }
    
    function shouldTransitionPhase2(
        uint256 currentValue,
        uint256 targetValue,
        uint256 timeElapsed
    ) external view override returns (bool) {
        return false;
    }
    
    function getRRLParameters() external view override returns (RRLParameters memory) {
        return _parameters;
    }
    
    function getLastExecutionTime() external view override returns (uint256) {
        return _lastExecutionTime;
    }
    
    function getExecutionCount() external view override returns (uint256) {
        return _executionCount;
    }
    
    function canExecute() external view override returns (bool) {
        return block.timestamp >= _lastExecutionTime + _parameters.harvestInterval;
    }
    
    function updateParameters(
        uint256 capitalWeight,
        uint256 yieldWeight,
        uint256 momentumWeight
    ) external override {
        _parameters.capitalWeight = capitalWeight;
        _parameters.yieldWeight = yieldWeight;
        _parameters.momentumWeight = momentumWeight;
    }
    
    function setRebalanceThreshold(uint256 threshold) external override {
        _parameters.rebalanceThreshold = threshold;
    }
    
    function setHarvestInterval(uint256 interval) external override {
        _parameters.harvestInterval = interval;
    }
    
    function calculatePerformanceRatio(
        uint256 actualAPY,
        uint256 targetAPY
    ) external pure override returns (uint256) {
        if (targetAPY == 0) return 10000;
        return (actualAPY * 10000) / targetAPY;
    }
    
    function calculateRiskScore(
        StrandPerformance[] calldata strandData
    ) external pure override returns (uint256) {
        return 5000; // 50% risk score
    }
}
