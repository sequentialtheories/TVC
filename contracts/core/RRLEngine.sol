// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IRRLEngine.sol";
import "../libraries/RRLCalculations.sol";
import "../libraries/VaultMath.sol";

contract RRLEngine is IRRLEngine, Ownable, ReentrancyGuard, Pausable {
    using RRLCalculations for uint256;
    using VaultMath for uint256;
    
    // State variables
    RRLParameters private _parameters;
    uint256 private _lastExecutionTime;
    uint256 private _executionCount;
    address private _megaVault;
    
    // Performance tracking
    mapping(uint256 => uint256) private _historicalYields;
    mapping(uint256 => uint256) private _riskScores;
    uint256 private _totalExecutions;
    
    // Constants
    uint256 private constant MAX_WEIGHT = 10000; // 100%
    uint256 private constant MIN_REBALANCE_THRESHOLD = 100; // 1%
    uint256 private constant MAX_REBALANCE_THRESHOLD = 2000; // 20%
    uint256 private constant MIN_HARVEST_INTERVAL = 24 hours;
    uint256 private constant MAX_HARVEST_INTERVAL = 30 days;
    uint256 private constant PHASE_2_COMPLETION_THRESHOLD = 5000; // 50%
    uint256 private constant PHASE_2_VALUE_MULTIPLIER = 2; // 2x target value
    
    // Events
    event RRLExecuted(
        uint256 indexed executionId,
        uint256 totalProfits,
        uint256[] newAllocations,
        uint256 riskScore
    );
    event ParametersUpdated(
        uint256 capitalWeight,
        uint256 yieldWeight,
        uint256 momentumWeight,
        uint256 rebalanceThreshold
    );
    event RebalanceTriggered(uint256 totalReallocation, bool requiresRebalance);
    event Phase2TransitionEvaluated(bool shouldTransition, uint256 currentValue, uint256 targetValue);
    
    // Modifiers
    modifier onlyMegaVault() {
        require(msg.sender == _megaVault, "Only MegaVault can call");
        _;
    }
    
    constructor(address megaVault) {
        require(megaVault != address(0), "Invalid MegaVault address");
        
        _megaVault = megaVault;
        _lastExecutionTime = 0;
        _executionCount = 0;
        _totalExecutions = 0;
        
        // Initialize default RRL parameters (Phase 1)
        _parameters = RRLParameters({
            capitalWeight: 1000,    // 10%
            yieldWeight: 6000,      // 60%
            momentumWeight: 3000,   // 30%
            rebalanceThreshold: 500, // 5%
            harvestInterval: 168 hours // 1 week
        });
    }
    
    // Core RRL execution function
    
    function executeRRL(
        uint256 totalProfits,
        StrandPerformance[] calldata strandData
    ) external override onlyMegaVault nonReentrant whenNotPaused returns (RRLResult memory) {
        require(canExecute(), "RRL execution not ready");
        require(strandData.length == 3, "Invalid strand data length");
        
        _lastExecutionTime = block.timestamp;
        _executionCount++;
        _totalExecutions++;
        
        // Calculate optimal allocation based on performance
        uint256[] memory newAllocations = _calculateOptimalAllocation(strandData, totalProfits);
        
        // Determine if rebalancing is required
        bool requiresRebalance = _shouldRebalance(strandData, newAllocations);
        
        // Calculate expected yield and risk score
        uint256 expectedYield = _calculateExpectedYield(strandData, newAllocations, totalProfits);
        uint256 riskScore = _calculateRiskScore(strandData);
        
        // Store historical data
        _historicalYields[_executionCount] = expectedYield;
        _riskScores[_executionCount] = riskScore;
        
        RRLResult memory result = RRLResult({
            newAllocations: newAllocations,
            totalReallocation: totalProfits,
            requiresRebalance: requiresRebalance,
            expectedYield: expectedYield,
            riskScore: riskScore
        });
        
        emit RRLExecuted(_executionCount, totalProfits, newAllocations, riskScore);
        emit RebalanceTriggered(totalProfits, requiresRebalance);
        
        return result;
    }
    
    // Allocation calculation functions
    
    function calculateOptimalAllocation(
        StrandPerformance[] calldata strandData
    ) external view override returns (uint256[] memory) {
        return _calculateOptimalAllocation(strandData, 0);
    }
    
    function _calculateOptimalAllocation(
        StrandPerformance[] calldata strandData,
        uint256 totalProfits
    ) internal view returns (uint256[] memory) {
        uint256[] memory allocations = new uint256[](3);
        
        // Base allocations from parameters
        allocations[0] = _parameters.capitalWeight;   // Capital strand
        allocations[1] = _parameters.yieldWeight;     // Yield strand
        allocations[2] = _parameters.momentumWeight;  // Momentum strand
        
        // Performance-based adjustments
        if (strandData.length == 3 && totalProfits > 0) {
            allocations = _adjustAllocationsForPerformance(allocations, strandData);
        }
        
        // Ensure allocations sum to 100%
        allocations = _normalizeAllocations(allocations);
        
        return allocations;
    }
    
    function _adjustAllocationsForPerformance(
        uint256[] memory baseAllocations,
        StrandPerformance[] calldata strandData
    ) internal pure returns (uint256[] memory) {
        uint256[] memory adjustedAllocations = new uint256[](3);
        
        for (uint256 i = 0; i < 3; i++) {
            adjustedAllocations[i] = baseAllocations[i];
            
            // Adjust based on performance ratio
            uint256 performanceRatio = strandData[i].actualAPY > 0 ? 
                (strandData[i].actualAPY * 10000) / strandData[i].targetAPY : 10000;
            
            if (performanceRatio > 11000) { // >110% performance
                adjustedAllocations[i] = (adjustedAllocations[i] * 110) / 100; // +10%
            } else if (performanceRatio < 9000) { // <90% performance
                adjustedAllocations[i] = (adjustedAllocations[i] * 90) / 100; // -10%
            }
        }
        
        return adjustedAllocations;
    }
    
    function _normalizeAllocations(uint256[] memory allocations) internal pure returns (uint256[] memory) {
        uint256 total = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }
        
        if (total == 0) {
            // Fallback to equal distribution
            for (uint256 i = 0; i < allocations.length; i++) {
                allocations[i] = MAX_WEIGHT / allocations.length;
            }
        } else if (total != MAX_WEIGHT) {
            // Normalize to 100%
            for (uint256 i = 0; i < allocations.length; i++) {
                allocations[i] = (allocations[i] * MAX_WEIGHT) / total;
            }
        }
        
        return allocations;
    }
    
    // Rebalancing logic
    
    function shouldRebalance(
        StrandPerformance[] calldata strandData
    ) external view override returns (bool) {
        uint256[] memory optimalAllocations = _calculateOptimalAllocation(strandData, 0);
        return _shouldRebalance(strandData, optimalAllocations);
    }
    
    function _shouldRebalance(
        StrandPerformance[] calldata strandData,
        uint256[] memory optimalAllocations
    ) internal view returns (bool) {
        if (strandData.length != optimalAllocations.length) return false;
        
        for (uint256 i = 0; i < strandData.length; i++) {
            // Calculate current allocation as percentage of total value
            uint256 totalValue = 0;
            for (uint256 j = 0; j < strandData.length; j++) {
                totalValue += strandData[j].currentValue;
            }
            
            uint256 currentAllocation = totalValue > 0 ? 
                (strandData[i].currentValue * 10000) / totalValue : 0;
            uint256 optimalAllocation = optimalAllocations[i];
            
            uint256 deviation = currentAllocation > optimalAllocation ?
                currentAllocation - optimalAllocation :
                optimalAllocation - currentAllocation;
            
            if (deviation > _parameters.rebalanceThreshold) {
                return true;
            }
        }
        
        return false;
    }
    
    // Phase 2 transition logic
    
    function shouldTransitionPhase2(
        uint256 currentValue,
        uint256 targetValue,
        uint256 timeElapsed
    ) external view override returns (bool) {
        // Check completion percentage
        if (targetValue > 0) {
            uint256 completionPercentage = (currentValue * 10000) / targetValue;
            if (completionPercentage >= PHASE_2_COMPLETION_THRESHOLD) {
                return true;
            }
        }
        
        // Check value threshold (2x target or significant value)
        uint256 valueThreshold = targetValue * PHASE_2_VALUE_MULTIPLIER;
        if (currentValue >= valueThreshold) {
            return true;
        }
        
        return false;
    }
    
    // Calculation helper functions
    
    function _calculateExpectedYield(
        StrandPerformance[] calldata strandData,
        uint256[] memory allocations,
        uint256 totalProfits
    ) internal pure returns (uint256) {
        uint256 weightedYield = 0;
        
        for (uint256 i = 0; i < strandData.length && i < allocations.length; i++) {
            uint256 strandYield = (strandData[i].actualAPY * allocations[i]) / 10000;
            weightedYield += strandYield;
        }
        
        // Factor in current profits
        return weightedYield + (totalProfits / 10);
    }
    
    function calculateRiskScore(
        StrandPerformance[] calldata strandData
    ) external pure override returns (uint256) {
        return _calculateRiskScore(strandData);
    }
    
    function _calculateRiskScore(
        StrandPerformance[] calldata strandData
    ) internal pure returns (uint256) {
        if (strandData.length == 0) return 5000; // 50% default risk
        
        uint256 totalRisk = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < strandData.length; i++) {
            // Risk increases with higher APY and volatility
            uint256 strandRisk = strandData[i].targetAPY / 2; // Base risk from APY
            
            // Add volatility risk based on performance deviation
            if (strandData[i].targetAPY > 0) {
                uint256 deviation = strandData[i].actualAPY > strandData[i].targetAPY ?
                    strandData[i].actualAPY - strandData[i].targetAPY :
                    strandData[i].targetAPY - strandData[i].actualAPY;
                
                uint256 volatilityRisk = (deviation * 1000) / strandData[i].targetAPY;
                strandRisk += volatilityRisk;
            }
            
            // Calculate allocation weight from current value
            uint256 totalValue = 0;
            for (uint256 j = 0; j < strandData.length; j++) {
                totalValue += strandData[j].currentValue;
            }
            
            uint256 allocationWeight = totalValue > 0 ? 
                (strandData[i].currentValue * 10000) / totalValue : 0;
            
            totalRisk += strandRisk * allocationWeight;
            totalWeight += allocationWeight;
        }
        
        return totalWeight > 0 ? totalRisk / totalWeight : 5000;
    }
    
    function calculatePerformanceRatio(
        uint256 actualAPY,
        uint256 targetAPY
    ) external pure override returns (uint256) {
        if (targetAPY == 0) return 10000; // 100%
        return (actualAPY * 10000) / targetAPY;
    }
    
    // View functions
    
    function getRRLParameters() external view override returns (RRLParameters memory) {
        return _parameters;
    }
    
    function getLastExecutionTime() external view override returns (uint256) {
        return _lastExecutionTime;
    }
    
    function getExecutionCount() external view override returns (uint256) {
        return _executionCount;
    }
    
    function canExecute() public view override returns (bool) {
        return block.timestamp >= _lastExecutionTime + _parameters.harvestInterval;
    }
    
    // Parameter management functions
    
    function updateParameters(
        uint256 capitalWeight,
        uint256 yieldWeight,
        uint256 momentumWeight
    ) external override onlyOwner {
        require(
            capitalWeight + yieldWeight + momentumWeight == MAX_WEIGHT,
            "Weights must sum to 100%"
        );
        
        _parameters.capitalWeight = capitalWeight;
        _parameters.yieldWeight = yieldWeight;
        _parameters.momentumWeight = momentumWeight;
        
        emit ParametersUpdated(capitalWeight, yieldWeight, momentumWeight, _parameters.rebalanceThreshold);
    }
    
    function setRebalanceThreshold(uint256 threshold) external override onlyOwner {
        require(
            threshold >= MIN_REBALANCE_THRESHOLD && threshold <= MAX_REBALANCE_THRESHOLD,
            "Invalid rebalance threshold"
        );
        
        _parameters.rebalanceThreshold = threshold;
        emit ParametersUpdated(
            _parameters.capitalWeight,
            _parameters.yieldWeight,
            _parameters.momentumWeight,
            threshold
        );
    }
    
    function setHarvestInterval(uint256 interval) external override onlyOwner {
        require(
            interval >= MIN_HARVEST_INTERVAL && interval <= MAX_HARVEST_INTERVAL,
            "Invalid harvest interval"
        );
        
        _parameters.harvestInterval = interval;
    }
    
    // Admin functions
    
    function setMegaVault(address megaVault) external onlyOwner {
        require(megaVault != address(0), "Invalid MegaVault address");
        _megaVault = megaVault;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Historical data functions
    
    function getHistoricalYield(uint256 executionId) external view returns (uint256) {
        return _historicalYields[executionId];
    }
    
    function getHistoricalRiskScore(uint256 executionId) external view returns (uint256) {
        return _riskScores[executionId];
    }
    
    function getTotalExecutions() external view returns (uint256) {
        return _totalExecutions;
    }
}
