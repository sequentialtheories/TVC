// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IStrandManager.sol";
import "../libraries/VaultMath.sol";

contract StrandManagerMomentum is IStrandManager, Ownable, ReentrancyGuard, Pausable {
    using VaultMath for uint256;
    
    // State variables
    StrandInfo private strandInfo;
    PerformanceMetrics private performanceMetrics;
    address private strategy;
    address private megaVault;
    
    uint256 private totalDeployed;
    uint256 private availableYield;
    uint256 private targetAllocation;
    
    // Momentum-specific variables
    uint256 private liquidityPoolCount;
    uint256 private totalLPTokens;
    uint256 private impermanentLossBuffer;
    
    // Constants
    uint256 private constant TARGET_APY = 1500; // 15%
    uint256 private constant DEPLOYMENT_THRESHOLD = 1000 * 1e6; // 1000 USDC
    uint256 private constant REBALANCE_THRESHOLD = 500; // 5%
    uint256 private constant MAX_SLIPPAGE = 300; // 3%
    uint256 private constant IL_BUFFER_RATE = 200; // 2% impermanent loss buffer
    
    // Events (additional events not in interface)
    event StrategyUpdated(address oldStrategy, address newStrategy);
    event Rebalanced(uint256 newAllocation);
    event LiquidityAdded(uint256 amount, address pool);
    event LiquidityRemoved(uint256 amount, address pool);
    event TradingFeesHarvested(uint256 amount);
    event ImpermanentLossDetected(uint256 amount);
    event SlippageExceeded(uint256 actualSlippage, uint256 maxSlippage);
    
    // Modifiers
    modifier onlyMegaVault() {
        require(msg.sender == megaVault, "Only MegaVault can call");
        _;
    }
    
    constructor(address _megaVault) {
        require(_megaVault != address(0), "Invalid MegaVault address");
        
        megaVault = _megaVault;
        targetAllocation = 3000; // 30%
        liquidityPoolCount = 0;
        totalLPTokens = 0;
        impermanentLossBuffer = 0;
        
        strandInfo = StrandInfo({
            strandType: StrandType.MOMENTUM,
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
        
        // Reserve impermanent loss buffer
        uint256 bufferAmount = (amount * IL_BUFFER_RATE) / 10000;
        uint256 deployableAmount = amount - bufferAmount;
        
        totalDeployed += deployableAmount;
        impermanentLossBuffer += bufferAmount;
        strandInfo.totalDeployed = totalDeployed;
        strandInfo.currentValue = totalDeployed + availableYield + impermanentLossBuffer;
        
        // In production, this would deploy to QuickSwap LP farming
        // Simulate adding liquidity to various pools (MATIC/USDC, WETH/USDC, etc.)
        liquidityPoolCount++;
        totalLPTokens += deployableAmount;
        
        emit FundsDeployed(amount, strandInfo.primaryProtocol);
        emit LiquidityAdded(deployableAmount, address(0)); // Placeholder for actual pool
    }
    
    function withdrawFunds(uint256 amount) public override onlyMegaVault nonReentrant {
        require(amount > 0, "Invalid amount");
        require(amount <= strandInfo.currentValue, "Insufficient funds");
        
        // Check if we need to remove liquidity
        if (amount > availableYield + impermanentLossBuffer) {
            uint256 liquidityToRemove = amount - availableYield - impermanentLossBuffer;
            _removeLiquidity(liquidityToRemove);
        }
        
        // Withdraw from available sources
        if (amount <= availableYield) {
            availableYield -= amount;
        } else if (amount <= availableYield + impermanentLossBuffer) {
            uint256 remainingAmount = amount - availableYield;
            availableYield = 0;
            impermanentLossBuffer -= remainingAmount;
        } else {
            uint256 remainingAmount = amount - availableYield - impermanentLossBuffer;
            availableYield = 0;
            impermanentLossBuffer = 0;
            totalDeployed -= remainingAmount;
        }
        
        strandInfo.totalDeployed = totalDeployed;
        strandInfo.currentValue = totalDeployed + availableYield + impermanentLossBuffer;
        
        emit FundsWithdrawn(amount, strandInfo.primaryProtocol);
    }
    
    function harvestYield() external override onlyMegaVault nonReentrant whenNotPaused returns (uint256) {
        // Simulate yield generation (15% APY from LP farming)
        uint256 timeElapsed = block.timestamp - performanceMetrics.lastUpdateTime;
        uint256 baseYield = (totalDeployed * TARGET_APY * timeElapsed) / (365 days * 10000);
        
        // Add trading fees and momentum bonuses
        uint256 tradingFees = (baseYield * 300) / 10000; // 3% trading fees
        uint256 momentumBonus = _calculateMomentumBonus(baseYield);
        
        uint256 totalYield = baseYield + tradingFees + momentumBonus;
        
        // Account for potential impermanent loss
        uint256 impermanentLoss = _calculateImpermanentLoss();
        if (impermanentLoss > 0) {
            if (impermanentLoss <= impermanentLossBuffer) {
                impermanentLossBuffer -= impermanentLoss;
            } else {
                totalYield = totalYield > (impermanentLoss - impermanentLossBuffer) ? 
                    totalYield - (impermanentLoss - impermanentLossBuffer) : 0;
                impermanentLossBuffer = 0;
            }
            emit ImpermanentLossDetected(impermanentLoss);
        }
        
        availableYield += totalYield;
        strandInfo.currentValue = totalDeployed + availableYield + impermanentLossBuffer;
        
        // Update performance metrics
        performanceMetrics.totalReturns += totalYield;
        performanceMetrics.totalFees += tradingFees;
        performanceMetrics.netYield = performanceMetrics.totalReturns - performanceMetrics.totalFees;
        performanceMetrics.lastUpdateTime = block.timestamp;
        
        // Calculate actual APY
        if (totalDeployed > 0 && timeElapsed > 0) {
            uint256 annualizedReturn = (totalYield * 365 days * 10000) / (totalDeployed * timeElapsed);
            strandInfo.actualAPY = annualizedReturn;
            performanceMetrics.averageAPY = (performanceMetrics.averageAPY + annualizedReturn) / 2;
        }
        
        emit YieldHarvested(totalYield);
        emit TradingFeesHarvested(tradingFees);
        return totalYield;
    }
    
    function rebalance() external override onlyMegaVault nonReentrant {
        // Momentum strand rebalancing logic
        // Optimize LP allocation based on current market momentum
        
        uint256 currentAllocation = (strandInfo.currentValue * 10000) / getTotalSystemValue();
        
        if (currentAllocation > targetAllocation + REBALANCE_THRESHOLD ||
            currentAllocation < targetAllocation - REBALANCE_THRESHOLD) {
            
            // Check for high-momentum opportunities
            _rebalanceLiquidityPools();
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
        // Emergency withdrawal logic - remove all liquidity
        uint256 totalValue = strandInfo.currentValue;
        
        if (totalLPTokens > 0) {
            _removeLiquidity(totalLPTokens);
        }
        
        strandInfo.currentValue = 0;
        strandInfo.totalDeployed = 0;
        totalDeployed = 0;
        availableYield = 0;
        impermanentLossBuffer = 0;
        totalLPTokens = 0;
        liquidityPoolCount = 0;
        
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
    
    function _removeLiquidity(uint256 amount) internal {
        require(amount <= totalLPTokens, "Insufficient LP tokens");
        
        totalLPTokens -= amount;
        totalDeployed -= amount;
        
        if (totalLPTokens == 0) {
            liquidityPoolCount = 0;
        }
        
        emit LiquidityRemoved(amount, address(0)); // Placeholder for actual pool
    }
    
    function _calculateMomentumBonus(uint256 baseYield) internal view returns (uint256) {
        // Simulate momentum-based bonus calculation
        // Higher bonuses during high-momentum periods
        uint256 momentumFactor = (block.timestamp % 100) + 50; // Simulate momentum (50-150%)
        return (baseYield * momentumFactor) / 1000; // 5-15% bonus
    }
    
    function _calculateImpermanentLoss() internal view returns (uint256) {
        // Simulate impermanent loss calculation
        // Returns 0-2% of deployed capital as potential IL
        if (totalDeployed == 0) return 0;
        
        uint256 ilFactor = block.timestamp % 200; // 0-2% IL simulation
        return (totalDeployed * ilFactor) / 10000;
    }
    
    function _rebalanceLiquidityPools() internal {
        // Simulate rebalancing between different LP pools
        // In production, this would optimize allocation based on APY and momentum
    }
    
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
    
    function setMaxSlippage(uint256 newSlippage) external onlyOwner {
        require(newSlippage <= 1000, "Slippage too high"); // Max 10%
        // Update max slippage logic here
    }
    
    function setILBufferRate(uint256 newRate) external onlyOwner {
        require(newRate <= 500, "Buffer rate too high"); // Max 5%
        // Update IL buffer rate logic here
    }
    
    // Momentum-specific view functions
    
    function getLiquidityPoolCount() external view returns (uint256) {
        return liquidityPoolCount;
    }
    
    function getTotalLPTokens() external view returns (uint256) {
        return totalLPTokens;
    }
    
    function getImpermanentLossBuffer() external view returns (uint256) {
        return impermanentLossBuffer;
    }
}
