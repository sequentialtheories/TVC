// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrandManager.sol";
import "../libraries/VaultMath.sol";

contract StrandManagerYield is IStrandManager, Ownable, ReentrancyGuard, Pausable {
    using VaultMath for uint256;
    
    // State variables
    StrandInfo private strandInfo;
    PerformanceMetrics private performanceMetrics;
    address private strategy;
    address private megaVault;
    
    uint256 private totalDeployed;
    uint256 private availableYield;
    uint256 private targetAllocation;
    
    // Constants
    uint256 private constant TARGET_APY = 1000; // 10%
    uint256 private constant DEPLOYMENT_THRESHOLD = 1000 * 1e6; // 1000 USDC
    uint256 private constant REBALANCE_THRESHOLD = 500; // 5%
    
    // Events (additional events not in interface)
    event StrategyUpdated(address oldStrategy, address newStrategy);
    event Rebalanced(uint256 newAllocation);
    event TokensLent(uint256 amount, address token);
    event LendingReturnsHarvested(uint256 amount);
    
    // Modifiers
    modifier onlyMegaVault() {
        require(msg.sender == megaVault, "Only MegaVault can call");
        _;
    }
    
    constructor(address _megaVault) {
        require(_megaVault != address(0), "Invalid MegaVault address");
        
        megaVault = _megaVault;
        targetAllocation = 6000; // 60%
        
        strandInfo = StrandInfo({
            strandType: StrandType.YIELD,
            totalDeployed: 0,
            currentValue: 0,
            targetAPY: TARGET_APY,
            actualAPY: 0,
            primaryProtocol: address(0),
            isActive: true
        });
        
        performanceMetrics = PerformanceMetrics({
            totalReturns: 0,
            totalFees: 0,
            netYield: 0,
            lastUpdateTime: block.timestamp,
            averageAPY: 0
        });
    }
    
    // Core functions
    
    function deployFunds(uint256 amount) public override onlyMegaVault nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(amount >= DEPLOYMENT_THRESHOLD, "Amount below threshold");
        
        totalDeployed += amount;
        strandInfo.totalDeployed = totalDeployed;
        strandInfo.currentValue = totalDeployed + availableYield;
        
        // In production, this would deploy to AAVE token lending
        // Simulate lending to various tokens (MATIC, WETH, etc.)
        
        emit FundsDeployed(amount, strandInfo.primaryProtocol);
        emit TokensLent(amount, address(0)); // Placeholder for actual token
    }
    
    function withdrawFunds(uint256 amount) public override onlyMegaVault nonReentrant {
        require(amount > 0, "Invalid amount");
        require(amount <= strandInfo.currentValue, "Insufficient funds");
        
        if (amount <= availableYield) {
            availableYield -= amount;
        } else {
            uint256 remainingAmount = amount - availableYield;
            availableYield = 0;
            totalDeployed -= remainingAmount;
        }
        
        strandInfo.totalDeployed = totalDeployed;
        strandInfo.currentValue = totalDeployed + availableYield;
        
        emit FundsWithdrawn(amount, strandInfo.primaryProtocol);
    }
    
    function harvestYield() external override onlyMegaVault nonReentrant whenNotPaused returns (uint256) {
        // Simulate yield generation (10% APY)
        uint256 timeElapsed = block.timestamp - performanceMetrics.lastUpdateTime;
        uint256 newYield = (totalDeployed * TARGET_APY * timeElapsed) / (365 days * 10000);
        
        // Add volatility bonus for token lending (higher risk, higher reward)
        uint256 volatilityBonus = (newYield * 200) / 10000; // 2% bonus
        newYield += volatilityBonus;
        
        availableYield += newYield;
        strandInfo.currentValue = totalDeployed + availableYield;
        
        // Update performance metrics
        performanceMetrics.totalReturns += newYield;
        performanceMetrics.netYield = performanceMetrics.totalReturns - performanceMetrics.totalFees;
        performanceMetrics.lastUpdateTime = block.timestamp;
        
        // Calculate actual APY
        if (totalDeployed > 0 && timeElapsed > 0) {
            uint256 annualizedReturn = (newYield * 365 days * 10000) / (totalDeployed * timeElapsed);
            strandInfo.actualAPY = annualizedReturn;
            performanceMetrics.averageAPY = (performanceMetrics.averageAPY + annualizedReturn) / 2;
        }
        
        emit YieldHarvested(newYield);
        emit LendingReturnsHarvested(newYield);
        return newYield;
    }
    
    function rebalance() external override onlyMegaVault nonReentrant {
        // Yield strand rebalancing logic
        // Optimize token allocation based on current market conditions
        
        uint256 currentAllocation = (strandInfo.currentValue * 10000) / getTotalSystemValue();
        
        if (currentAllocation > targetAllocation + REBALANCE_THRESHOLD ||
            currentAllocation < targetAllocation - REBALANCE_THRESHOLD) {
            // Trigger rebalancing
            emit Rebalanced(targetAllocation);
        }
    }
    
    function deposit(uint256 amount) external override onlyMegaVault nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        
        // Add to available funds for deployment
        if (amount >= DEPLOYMENT_THRESHOLD) {
            deployFunds(amount);
        } else {
            // Hold in reserve until threshold is met
            availableYield += amount;
            strandInfo.currentValue += amount;
        }
    }
    
    function withdraw(uint256 amount) external override onlyMegaVault nonReentrant {
        withdrawFunds(amount);
    }
    
    // View functions
    
    function getStrandInfo() external view override returns (StrandInfo memory) {
        return strandInfo;
    }
    
    function getPerformanceMetrics() external view override returns (PerformanceMetrics memory) {
        return performanceMetrics;
    }
    
    function getCurrentValue() external view override returns (uint256) {
        return strandInfo.currentValue;
    }
    
    function getTotalValue() external view override returns (uint256) {
        return strandInfo.currentValue;
    }
    
    function getAvailableYield() external view override returns (uint256) {
        return availableYield;
    }
    
    function getTargetAllocation() external view override returns (uint256) {
        return targetAllocation;
    }
    
    function getProfits() external view override returns (uint256) {
        return performanceMetrics.netYield;
    }
    
    // Strategy management
    
    function updateStrategy(address newStrategy) external override onlyOwner {
        require(newStrategy != address(0), "Invalid strategy address");
        
        address oldStrategy = strategy;
        strategy = newStrategy;
        strandInfo.primaryProtocol = newStrategy;
        
        emit StrategyUpdated(oldStrategy, newStrategy);
    }
    
    function getStrategy() external view override returns (address) {
        return strategy;
    }
    
    function validateStrategy(address _strategy) external pure override returns (bool) {
        return _strategy != address(0);
    }
    
    // Emergency functions
    
    function emergencyWithdraw() external override onlyOwner whenPaused {
        // Emergency withdrawal logic
        uint256 totalValue = strandInfo.currentValue;
        
        strandInfo.currentValue = 0;
        strandInfo.totalDeployed = 0;
        totalDeployed = 0;
        availableYield = 0;
        
        emit FundsWithdrawn(totalValue, strandInfo.primaryProtocol);
    }
    
    function emergencyPause() external override onlyOwner {
        _pause();
        strandInfo.isActive = false;
    }
    
    function emergencyUnpause() external override onlyOwner {
        _unpause();
        strandInfo.isActive = true;
    }
    
    // Notification functions
    
    function notifyRebalance(uint256 newAllocation) external override onlyMegaVault {
        targetAllocation = newAllocation;
        emit Rebalanced(newAllocation);
    }
    
    function requestYieldData() external view override returns (uint256, uint256) {
        return (strandInfo.currentValue, availableYield);
    }
    
    // Internal helper functions
    
    function getTotalSystemValue() internal view returns (uint256) {
        // This would query the MegaVault for total system value
        // For now, return a placeholder
        return 1000000 * 1e6; // 1M USDC
    }
    
    // Admin functions
    
    function setMegaVault(address _megaVault) external onlyOwner {
        require(_megaVault != address(0), "Invalid MegaVault address");
        megaVault = _megaVault;
    }
    
    function updateTargetAPY(uint256 newAPY) external onlyOwner {
        strandInfo.targetAPY = newAPY;
    }
    
    function setRebalanceThreshold(uint256 newThreshold) external onlyOwner {
        require(newThreshold <= 1000, "Threshold too high"); // Max 10%
        // Update rebalance threshold logic here
    }
}
