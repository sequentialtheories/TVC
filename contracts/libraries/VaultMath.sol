// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library VaultMath {
    uint256 private constant PRECISION = 1e18;
    uint256 private constant PERCENTAGE_BASE = 10000; // 100.00%
    
    // Calculation errors
    error DivisionByZero();
    error InvalidPercentage();
    error Overflow();
    
    /**
     * @dev Calculate percentage of a value
     * @param value The base value
     * @param percentage The percentage (in basis points, e.g., 1000 = 10%)
     * @return The calculated percentage value
     */
    function calculatePercentage(
        uint256 value,
        uint256 percentage
    ) internal pure returns (uint256) {
        if (percentage > PERCENTAGE_BASE) revert InvalidPercentage();
        return (value * percentage) / PERCENTAGE_BASE;
    }
    
    /**
     * @dev Calculate compound interest
     * @param principal The initial amount
     * @param rate The interest rate (annual, in basis points)
     * @param time The time period in seconds
     * @return The compound interest amount
     */
    function calculateCompoundInterest(
        uint256 principal,
        uint256 rate,
        uint256 time
    ) internal pure returns (uint256) {
        if (principal == 0 || rate == 0 || time == 0) return 0;
        
        // Convert annual rate to per-second rate
        uint256 secondsPerYear = 365 * 24 * 60 * 60;
        uint256 periodicRate = (rate * PRECISION) / (PERCENTAGE_BASE * secondsPerYear);
        
        // Simple approximation for compound interest
        // A = P(1 + r)^t ≈ P(1 + rt) for small rates
        uint256 interest = (principal * periodicRate * time) / PRECISION;
        return interest;
    }
    
    /**
     * @dev Calculate APY from total returns over time
     * @param initialValue The starting value
     * @param finalValue The ending value
     * @param timeElapsed Time period in seconds
     * @return APY in basis points
     */
    function calculateAPY(
        uint256 initialValue,
        uint256 finalValue,
        uint256 timeElapsed
    ) internal pure returns (uint256) {
        if (initialValue == 0 || timeElapsed == 0) return 0;
        if (finalValue <= initialValue) return 0;
        
        uint256 returnAmount = finalValue - initialValue;
        uint256 returnRate = (returnAmount * PRECISION) / initialValue;
        
        // Annualize the return rate
        uint256 secondsPerYear = 365 * 24 * 60 * 60;
        uint256 annualizedRate = (returnRate * secondsPerYear) / timeElapsed;
        
        // Convert to basis points
        return (annualizedRate * PERCENTAGE_BASE) / PRECISION;
    }
    
    /**
     * @dev Calculate weighted average
     * @param values Array of values
     * @param weights Array of weights (must sum to PERCENTAGE_BASE)
     * @return The weighted average
     */
    function calculateWeightedAverage(
        uint256[] memory values,
        uint256[] memory weights
    ) internal pure returns (uint256) {
        if (values.length != weights.length) revert InvalidPercentage();
        if (values.length == 0) return 0;
        
        uint256 totalWeightedValue = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < values.length; i++) {
            totalWeightedValue += values[i] * weights[i];
            totalWeight += weights[i];
        }
        
        if (totalWeight == 0) revert DivisionByZero();
        return totalWeightedValue / totalWeight;
    }
    
    /**
     * @dev Calculate standard deviation
     * @param values Array of values
     * @return Standard deviation scaled by PRECISION
     */
    function calculateStandardDeviation(
        uint256[] memory values
    ) internal pure returns (uint256) {
        if (values.length <= 1) return 0;
        
        // Calculate mean
        uint256 sum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            sum += values[i];
        }
        uint256 mean = sum / values.length;
        
        // Calculate variance
        uint256 varianceSum = 0;
        for (uint256 i = 0; i < values.length; i++) {
            uint256 diff = values[i] > mean ? values[i] - mean : mean - values[i];
            varianceSum += (diff * diff);
        }
        uint256 variance = varianceSum / values.length;
        
        // Return square root approximation
        return sqrt(variance);
    }
    
    /**
     * @dev Calculate square root using Babylonian method
     * @param x The number to find square root of
     * @return The square root
     */
    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        
        return y;
    }
    
    /**
     * @dev Safe division with precision
     * @param a Numerator
     * @param b Denominator
     * @return Result with PRECISION scaling
     */
    function safeDivision(uint256 a, uint256 b) internal pure returns (uint256) {
        if (b == 0) revert DivisionByZero();
        return (a * PRECISION) / b;
    }
    
    /**
     * @dev Calculate risk-adjusted return (Sharpe ratio approximation)
     * @param returnAmount The returns value
     * @param riskFreeRate The risk-free rate
     * @param volatility The volatility measure
     * @return Risk-adjusted return score
     */
    function calculateRiskAdjustedReturn(
        uint256 returnAmount,
        uint256 riskFreeRate,
        uint256 volatility
    ) internal pure returns (uint256) {
        if (volatility == 0) return 0;
        if (returnAmount <= riskFreeRate) return 0;
        
        uint256 excessReturn = returnAmount - riskFreeRate;
        return (excessReturn * PRECISION) / volatility;
    }
}
