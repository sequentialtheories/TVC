// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./VaultMath.sol";

library RRLCalculations {
    using VaultMath for uint256;
    
    uint256 private constant PRECISION = 1e18;
    uint256 private constant PERCENTAGE_BASE = 10000; // 100.00%
    
    // Default RRL weights (can be overridden)
    uint256 private constant DEFAULT_CAPITAL_WEIGHT = 1000;  // 10%
    uint256 private constant DEFAULT_YIELD_WEIGHT = 6000;    // 60%
    uint256 private constant DEFAULT_MOMENTUM_WEIGHT = 3000; // 30%
    
    // RRL calculation errors
    error InvalidWeights();
    error InvalidStrandData();
    error InsufficientData();
    
    struct StrandMetrics {
        uint256 currentValue;
        uint256 targetValue;
        uint256 actualAPY;
        uint256 targetAPY;
        uint256 performanceRatio;
        uint256 riskScore;
        uint256 allocation;
    }
    
    struct RRLConfig {
        uint256 capitalWeight;
        uint256 yieldWeight;
        uint256 momentumWeight;
        uint256 rebalanceThreshold;
        uint256 performanceWindow;
        uint256 riskTolerance;
    }
    
    /**
     * @dev Execute the core RRL algorithm
     * @param strands Array of strand performance data
     * @param config RRL configuration parameters
     * @param totalProfits Total profits to redistribute
     * @return newAllocations New allocation percentages for each strand
     * @return totalReallocation Total amount being reallocated
     */
    function executeRRL(
        StrandMetrics[] memory strands,
        RRLConfig memory config,
        uint256 totalProfits
    ) internal pure returns (
        uint256[] memory newAllocations,
        uint256 totalReallocation
    ) {
        if (strands.length != 3) revert InvalidStrandData();
        if (!_validateWeights(config)) revert InvalidWeights();
        
        // Calculate performance scores for each strand
        uint256[] memory performanceScores = _calculatePerformanceScores(strands);
        
        // Calculate risk-adjusted allocations
        newAllocations = _calculateOptimalAllocations(
            strands,
            config,
            performanceScores
        );
        
        // Calculate total reallocation needed
        totalReallocation = _calculateReallocationAmount(
            strands,
            newAllocations,
            totalProfits
        );
        
        return (newAllocations, totalReallocation);
    }
    
    /**
     * @dev Calculate performance scores for each strand
     * @param strands Array of strand metrics
     * @return scores Performance scores for each strand
     */
    function _calculatePerformanceScores(
        StrandMetrics[] memory strands
    ) private pure returns (uint256[] memory scores) {
        scores = new uint256[](strands.length);
        
        for (uint256 i = 0; i < strands.length; i++) {
            // Base performance ratio
            uint256 performanceRatio = strands[i].performanceRatio;
            
            // Risk adjustment
            uint256 riskAdjustment = PRECISION;
            if (strands[i].riskScore > 0) {
                riskAdjustment = PRECISION - (strands[i].riskScore * 1000) / PERCENTAGE_BASE;
            }
            
            // Calculate final score
            scores[i] = (performanceRatio * riskAdjustment) / PRECISION;
        }
        
        return scores;
    }
    
    /**
     * @dev Calculate optimal allocations based on performance and risk
     * @param strands Strand metrics
     * @param config RRL configuration
     * @param performanceScores Performance scores for each strand
     * @return allocations New allocation percentages
     */
    function _calculateOptimalAllocations(
        StrandMetrics[] memory strands,
        RRLConfig memory config,
        uint256[] memory performanceScores
    ) private pure returns (uint256[] memory allocations) {
        allocations = new uint256[](3);
        
        // Start with base weights
        allocations[0] = config.capitalWeight;   // Capital strand
        allocations[1] = config.yieldWeight;     // Yield strand  
        allocations[2] = config.momentumWeight;  // Momentum strand
        
        // Calculate performance adjustments
        uint256 totalPerformance = performanceScores[0] + performanceScores[1] + performanceScores[2];
        
        if (totalPerformance > 0) {
            // Redistribute based on relative performance
            uint256 adjustmentPool = config.rebalanceThreshold;
            
            for (uint256 i = 0; i < 3; i++) {
                uint256 performanceWeight = (performanceScores[i] * PERCENTAGE_BASE) / totalPerformance;
                uint256 baseWeight = allocations[i];
                
                // Calculate adjustment
                int256 adjustment = int256(performanceWeight) - int256(baseWeight);
                adjustment = (adjustment * int256(adjustmentPool)) / int256(PERCENTAGE_BASE);
                
                // Apply bounded adjustment
                if (adjustment > 0) {
                    allocations[i] += uint256(adjustment);
                } else if (uint256(-adjustment) < allocations[i]) {
                    allocations[i] -= uint256(-adjustment);
                }
            }
        }
        
        // Normalize to ensure total equals 100%
        _normalizeAllocations(allocations);
        
        return allocations;
    }
    
    /**
     * @dev Calculate total reallocation amount needed
     * @param strands Current strand data
     * @param newAllocations New target allocations
     * @param totalProfits Available profits for reallocation
     * @return reallocationAmount Total amount to be reallocated
     */
    function _calculateReallocationAmount(
        StrandMetrics[] memory strands,
        uint256[] memory newAllocations,
        uint256 totalProfits
    ) private pure returns (uint256 reallocationAmount) {
        uint256 totalCurrentValue = 0;
        for (uint256 i = 0; i < strands.length; i++) {
            totalCurrentValue += strands[i].currentValue;
        }
        
        uint256 totalTargetValue = totalCurrentValue + totalProfits;
        reallocationAmount = 0;
        
        for (uint256 i = 0; i < strands.length; i++) {
            uint256 targetValue = (totalTargetValue * newAllocations[i]) / PERCENTAGE_BASE;
            uint256 currentValue = strands[i].currentValue;
            
            if (targetValue > currentValue) {
                reallocationAmount += targetValue - currentValue;
            }
        }
        
        return reallocationAmount;
    }
    
    /**
     * @dev Check if rebalancing is needed based on threshold
     * @param strands Current strand data
     * @param targetAllocations Target allocation percentages
     * @param threshold Rebalance threshold in basis points
     * @return needsRebalance Whether rebalancing is required
     */
    function shouldRebalance(
        StrandMetrics[] memory strands,
        uint256[] memory targetAllocations,
        uint256 threshold
    ) internal pure returns (bool needsRebalance) {
        uint256 totalValue = 0;
        for (uint256 i = 0; i < strands.length; i++) {
            totalValue += strands[i].currentValue;
        }
        
        if (totalValue == 0) return false;
        
        for (uint256 i = 0; i < strands.length; i++) {
            uint256 currentAllocation = (strands[i].currentValue * PERCENTAGE_BASE) / totalValue;
            uint256 targetAllocation = targetAllocations[i];
            
            uint256 deviation = currentAllocation > targetAllocation
                ? currentAllocation - targetAllocation
                : targetAllocation - currentAllocation;
            
            if (deviation > threshold) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Calculate Phase 2 transition criteria
     * @param totalValue Current total vault value
     * @param targetValue Target value for Phase 2 transition
     * @param timeElapsed Time since contract start
     * @param lockPeriod Total contract lock period
     * @return shouldTransition Whether to transition to Phase 2
     */
    function shouldTransitionPhase2(
        uint256 totalValue,
        uint256 targetValue,
        uint256 timeElapsed,
        uint256 lockPeriod
    ) internal pure returns (bool shouldTransition) {
        // Condition 1: 50% completion by value
        bool valueCondition = totalValue >= (targetValue / 2);
        
        // Condition 2: 50% completion by time
        bool timeCondition = timeElapsed >= (lockPeriod / 2);
        
        // Transition if either condition is met
        return valueCondition || timeCondition;
    }
    
    /**
     * @dev Validate RRL configuration weights
     * @param config RRL configuration to validate
     * @return isValid Whether the configuration is valid
     */
    function _validateWeights(RRLConfig memory config) private pure returns (bool isValid) {
        uint256 totalWeight = config.capitalWeight + config.yieldWeight + config.momentumWeight;
        return totalWeight == PERCENTAGE_BASE;
    }
    
    /**
     * @dev Normalize allocations to sum to 100%
     * @param allocations Array of allocations to normalize
     */
    function _normalizeAllocations(uint256[] memory allocations) private pure {
        uint256 total = 0;
        for (uint256 i = 0; i < allocations.length; i++) {
            total += allocations[i];
        }
        
        if (total != PERCENTAGE_BASE && total > 0) {
            for (uint256 i = 0; i < allocations.length; i++) {
                allocations[i] = (allocations[i] * PERCENTAGE_BASE) / total;
            }
        }
    }
    
    /**
     * @dev Calculate risk score based on volatility and performance
     * @param historicalReturns Array of historical return values
     * @param targetReturn Expected target return
     * @return riskScore Risk score (higher = more risky)
     */
    function calculateRiskScore(
        uint256[] memory historicalReturns,
        uint256 targetReturn
    ) internal pure returns (uint256 riskScore) {
        if (historicalReturns.length < 2) return 0;
        
        // Calculate volatility (standard deviation)
        uint256 volatility = VaultMath.calculateStandardDeviation(historicalReturns);
        
        // Calculate downside deviation
        uint256 downsideDeviation = _calculateDownsideDeviation(historicalReturns, targetReturn);
        
        // Combine volatility and downside risk
        riskScore = (volatility + downsideDeviation * 2) / 3;
        
        return riskScore;
    }
    
    /**
     * @dev Calculate downside deviation from target
     * @param returnValues Array of return values
     * @param target Target return value
     * @return downsideDeviation Downside deviation measure
     */
    function _calculateDownsideDeviation(
        uint256[] memory returnValues,
        uint256 target
    ) private pure returns (uint256 downsideDeviation) {
        uint256 downsideSum = 0;
        uint256 downsideCount = 0;
        
        for (uint256 i = 0; i < returnValues.length; i++) {
            if (returnValues[i] < target) {
                uint256 deviation = target - returnValues[i];
                downsideSum += deviation * deviation;
                downsideCount++;
            }
        }
        
        if (downsideCount == 0) return 0;
        
        uint256 variance = downsideSum / downsideCount;
        return VaultMath.sqrt(variance);
    }
}
