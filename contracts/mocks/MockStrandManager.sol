// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IStrandManager.sol";

contract MockStrandManager is IStrandManager {
    uint256 private _totalValue = 1000000 * 1e6; // 1M USDC (with 6 decimals)
    uint256 private _profits = 50000 * 1e6; // 50K USDC (with 6 decimals)
    bool private _isActive = true;
    
    function deployFunds(uint256 amount) external override {}
    function withdrawFunds(uint256 amount) external override {}
    function harvestYield() external override returns (uint256) { return _profits; }
    function rebalance() external override {}
    function deposit(uint256 amount) external override {}
    function withdraw(uint256 amount) external override {}
    
    function getStrandInfo() external view override returns (StrandInfo memory) {
        return StrandInfo({
            strandType: StrandType.CAPITAL,
            totalDeployed: _totalValue,
            currentValue: _totalValue,
            targetAPY: 500,
            actualAPY: 500,
            primaryProtocol: address(0),
            isActive: _isActive
        });
    }
    
    function getPerformanceMetrics() external view override returns (PerformanceMetrics memory) {
        return PerformanceMetrics({
            totalReturns: _profits,
            totalFees: 1000,
            netYield: _profits - 1000,
            lastUpdateTime: block.timestamp,
            averageAPY: 500
        });
    }
    
    function getCurrentValue() external view override returns (uint256) { return _totalValue; }
    function getTotalValue() external view override returns (uint256) { return _totalValue; }
    function getAvailableYield() external view override returns (uint256) { return _profits; }
    function getTargetAllocation() external view override returns (uint256) { return 1000; }
    function getProfits() external view override returns (uint256) { return _profits; }
    
    function updateStrategy(address newStrategy) external override {}
    function getStrategy() external view override returns (address) { return address(0); }
    function validateStrategy(address strategy) external view override returns (bool) { return true; }
    
    function emergencyWithdraw() external override {}
    function emergencyPause() external override {}
    function emergencyUnpause() external override {}
    
    function notifyRebalance(uint256 newAllocation) external override {}
    function requestYieldData() external view override returns (uint256, uint256) { return (_totalValue, _profits); }
    
    // Test helper functions
    function setTotalValue(uint256 value) external { _totalValue = value; }
    function setProfits(uint256 profits) external { _profits = profits; }
}
