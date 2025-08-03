// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBTCAccumulator.sol";
import "../libraries/VaultMath.sol";

contract BTCAccumulator is IBTCAccumulator, Ownable, ReentrancyGuard, Pausable {
    using VaultMath for uint256;
    
    // State variables
    AccumulationState private _state;
    PriceData private _priceData;
    address private _megaVault;
    address private _wbtcToken;
    address private _usdcToken;
    
    // Purchase tracking
    struct PurchaseRecord {
        uint256 purchaseId;
        uint256 timestamp;
        uint256 usdcAmount;
        uint256 wbtcAmount;
        uint256 btcPrice;
    }
    
    mapping(uint256 => PurchaseRecord) private _purchases;
    uint256 private _purchaseCount;
    
    // Constants
    uint256 private constant PRICE_DECIMALS = 8; // BTC price with 8 decimals
    uint256 private constant USDC_DECIMALS = 6;  // USDC with 6 decimals
    uint256 private constant WBTC_DECIMALS = 8;  // wBTC with 8 decimals
    uint256 private constant MAX_SLIPPAGE = 500; // 5% max slippage
    uint256 private constant MIN_PURCHASE_AMOUNT = 100 * 1e6; // 100 USDC minimum
    uint256 private constant PRICE_STALENESS_THRESHOLD = 1 hours;
    
    // Additional events not in interface
    event WBTCPurchased(
        uint256 indexed purchaseId,
        uint256 usdcAmount,
        uint256 wbtcAmount,
        uint256 btcPrice,
        uint256 timestamp
    );
    event DCAParametersUpdated(
        uint256 purchaseInterval,
        uint256 targetAllocation,
        uint256 maxSlippage
    );
    event PriceUpdated(uint256 newPrice, uint256 timestamp);
    
    // Modifiers
    modifier onlyMegaVault() {
        require(msg.sender == _megaVault, "Only MegaVault can call");
        _;
    }
    
    modifier validPrice() {
        require(
            _priceData.currentPrice > 0 && 
            block.timestamp - _priceData.lastUpdateTime <= PRICE_STALENESS_THRESHOLD,
            "Stale or invalid BTC price"
        );
        _;
    }
    
    constructor(
        address megaVault,
        address wbtcToken,
        address usdcToken
    ) {
        require(megaVault != address(0), "Invalid MegaVault address");
        require(wbtcToken != address(0), "Invalid wBTC token address");
        require(usdcToken != address(0), "Invalid USDC token address");
        
        _megaVault = megaVault;
        _wbtcToken = wbtcToken;
        _usdcToken = usdcToken;
        _purchaseCount = 0;
        
        // Initialize accumulator state
        _state = AccumulationState({
            totalUSDInvested: 0,
            totalBTCAccumulated: 0,
            averageBuyPrice: 0,
            weeklyDCAAmount: MIN_PURCHASE_AMOUNT,
            lastPurchaseTime: 0,
            purchaseCount: 0,
            isActive: false
        });
        
        // Initialize price data
        _priceData = PriceData({
            currentPrice: 0,
            lastUpdateTime: 0,
            oracle: address(0),
            isValid: false
        });
    }
    
    // Core accumulation functions
    
    function notifyPhaseTransition() external override onlyMegaVault {
        require(!_state.isActive, "Accumulation already active");
        
        _state.isActive = true;
        _state.lastPurchaseTime = block.timestamp;
        
        emit AccumulationCompleted(_state.totalBTCAccumulated, _state.totalUSDInvested);
    }
    
    function executeDCA(uint256 usdAmount) external override onlyMegaVault nonReentrant whenNotPaused {
        require(_state.isActive, "Accumulation not active");
        require(usdAmount >= _state.weeklyDCAAmount, "Amount below minimum");
        require(canExecuteDCA(), "DCA not ready");
        
        // Calculate wBTC amount based on current price
        uint256 wbtcAmount = _calculateWBTCAmount(usdAmount);
        require(wbtcAmount > 0, "Invalid wBTC amount");
        
        // Execute the purchase (in production, this would interact with DEX)
        _executePurchaseInternal(usdAmount, wbtcAmount);
        
        // Update state
        _state.lastPurchaseTime = block.timestamp;
        _state.totalUSDInvested += usdAmount;
        _state.totalBTCAccumulated += wbtcAmount;
        _state.purchaseCount++;
        
        // Update average cost
        _updateAverageCost(usdAmount, wbtcAmount);
        
        // Record purchase
        _purchaseCount++;
        _purchases[_purchaseCount] = PurchaseRecord({
            purchaseId: _purchaseCount,
            timestamp: block.timestamp,
            usdcAmount: usdAmount,
            wbtcAmount: wbtcAmount,
            btcPrice: _priceData.currentPrice
        });
        
        emit DCAExecuted(usdAmount, wbtcAmount);
        emit BTCPurchased(usdAmount, wbtcAmount, _priceData.currentPrice);
    }
    
    function _executePurchaseInternal(uint256 usdcAmount, uint256 wbtcAmount) internal {
        // In production, this would:
        // 1. Approve USDC to DEX
        // 2. Execute swap on QuickSwap or similar DEX
        // 3. Handle slippage protection
        // 4. Verify received wBTC amount
        
        // For now, simulate the purchase
        // The actual DEX integration would be implemented here
    }
    
    function _calculateWBTCAmount(uint256 usdcAmount) internal view returns (uint256) {
        require(_priceData.currentPrice > 0, "Invalid BTC price");
        
        // Convert USDC to wBTC based on current price
        // usdcAmount (6 decimals) / btcPrice (8 decimals) = wbtcAmount (8 decimals)
        uint256 wbtcAmount = (usdcAmount * (10 ** PRICE_DECIMALS)) / _priceData.currentPrice;
        
        // Adjust for decimal differences (USDC 6 decimals, wBTC 8 decimals)
        wbtcAmount = (wbtcAmount * (10 ** WBTC_DECIMALS)) / (10 ** USDC_DECIMALS);
        
        return wbtcAmount;
    }
    
    function _updateAverageCost(uint256 usdcAmount, uint256 wbtcAmount) internal {
        if (_state.totalBTCAccumulated == 0) {
            _state.averageBuyPrice = _priceData.currentPrice;
        } else {
            // Weighted average calculation
            uint256 totalCost = _state.totalUSDInvested + usdcAmount;
            uint256 totalWBTC = _state.totalBTCAccumulated + wbtcAmount;
            
            if (totalWBTC > 0) {
                _state.averageBuyPrice = (totalCost * (10 ** PRICE_DECIMALS)) / totalWBTC;
                // Adjust for decimal differences
                _state.averageBuyPrice = (_state.averageBuyPrice * (10 ** USDC_DECIMALS)) / (10 ** WBTC_DECIMALS);
            }
        }
    }
    
    // Withdrawal functions
    
    function withdraw(uint256 amount) external override onlyMegaVault nonReentrant {
        require(amount > 0, "Invalid amount");
        require(amount <= _state.totalBTCAccumulated, "Insufficient BTC balance");
        
        _state.totalBTCAccumulated -= amount;
        
        // In production, transfer wBTC to MegaVault
        emit EmergencyWithdrawal(amount, _megaVault);
    }
    
    function completeAccumulation() external override onlyMegaVault nonReentrant {
        uint256 wbtcAmount = _state.totalBTCAccumulated;
        uint256 usdcAmount = _state.totalUSDInvested;
        
        _state.totalBTCAccumulated = 0;
        _state.totalUSDInvested = 0;
        _state.isActive = false;
        
        emit AccumulationCompleted(wbtcAmount, usdcAmount);
    }
    
    // View functions
    
    function getAccumulationState() external view override returns (AccumulationState memory) {
        return _state;
    }
    
    function getPriceData() external view override returns (PriceData memory) {
        return _priceData;
    }
    
    function getTotalValue() external view override returns (uint256) {
        return (_state.totalBTCAccumulated * _priceData.currentPrice) / (10 ** PRICE_DECIMALS);
    }
    
    function requestBTCBalance() external view override returns (uint256) {
        return _state.totalBTCAccumulated;
    }
    
    function canExecuteDCA() public view override returns (bool) {
        if (!_state.isActive) return false;
        return block.timestamp >= _state.lastPurchaseTime + 168 hours; // 1 week
    }
    
    function getNextDCATime() external view override returns (uint256) {
        return _state.lastPurchaseTime + 168 hours;
    }
    
    function getCurrentBTCPrice() external view override returns (uint256) {
        return _priceData.currentPrice;
    }
    
    function getProfits() external view override returns (uint256) {
        uint256 currentValue = this.getTotalValue();
        return currentValue > _state.totalUSDInvested ? 
            currentValue - _state.totalUSDInvested : 0;
    }
    
    function deposit(uint256 amount) external override onlyMegaVault {
        // Add funds for DCA purchases
        _state.totalUSDInvested += amount;
    }
    
    function purchaseBTC(uint256 usdAmount) external override onlyMegaVault returns (uint256 btcReceived) {
        require(_priceData.isValid, "Invalid price data");
        
        uint256 wbtcAmount = _calculateWBTCAmount(usdAmount);
        _executePurchaseInternal(usdAmount, wbtcAmount);
        
        _state.totalUSDInvested += usdAmount;
        _state.totalBTCAccumulated += wbtcAmount;
        _state.purchaseCount++;
        
        emit BTCPurchased(usdAmount, wbtcAmount, _priceData.currentPrice);
        
        return wbtcAmount;
    }
    
    function withdrawBTC(uint256 amount, address recipient) external override onlyMegaVault {
        require(amount <= _state.totalBTCAccumulated, "Insufficient balance");
        
        _state.totalBTCAccumulated -= amount;
        
        emit EmergencyWithdrawal(amount, recipient);
    }
    
    function validatePurchase(uint256 usdAmount) external view override returns (bool) {
        return usdAmount >= _state.weeklyDCAAmount && _priceData.isValid;
    }
    
    // Configuration functions
    
    function setWeeklyDCAAmount(uint256 amount) external override onlyOwner {
        require(amount > 0, "Invalid amount");
        _state.weeklyDCAAmount = amount;
    }
    
    function updatePriceOracle(address newOracle) external override onlyOwner {
        require(newOracle != address(0), "Invalid oracle");
        _priceData.oracle = newOracle;
        emit PriceOracleUpdated(newOracle);
    }
    
    function setPriceThreshold(uint256 threshold) external override onlyOwner {
        require(threshold > 0, "Invalid threshold");
        // Store threshold for price validation logic
    }
    
    // Emergency functions
    
    function emergencyWithdraw(uint256 amount) external override onlyOwner whenPaused {
        require(amount <= _state.totalBTCAccumulated, "Insufficient balance");
        
        _state.totalBTCAccumulated -= amount;
        _state.isActive = false;
        
        emit EmergencyWithdrawal(amount, owner());
    }
    
    function emergencyPause() external override onlyOwner {
        _pause();
        _state.isActive = false;
    }
    
    function emergencyUnpause() external override onlyOwner {
        _unpause();
    }
    
    // Admin functions
    
    function setMegaVault(address megaVault) external onlyOwner {
        require(megaVault != address(0), "Invalid MegaVault address");
        _megaVault = megaVault;
    }
    
    function setTokenAddresses(address wbtcToken, address usdcToken) external onlyOwner {
        require(wbtcToken != address(0), "Invalid wBTC address");
        require(usdcToken != address(0), "Invalid USDC address");
        
        _wbtcToken = wbtcToken;
        _usdcToken = usdcToken;
    }
    
    // Statistics functions
    
    function getTotalPurchases() external view returns (uint256) {
        return _state.purchaseCount;
    }
    
    function getTotalWBTCAccumulated() external view returns (uint256) {
        return _state.totalBTCAccumulated;
    }
    
    function getTotalUSDCSpent() external view returns (uint256) {
        return _state.totalUSDInvested;
    }
    
    function getROI() external view returns (int256) {
        if (_state.totalUSDInvested == 0) return 0;
        
        uint256 currentValue = (_state.totalBTCAccumulated * _priceData.currentPrice) / (10 ** PRICE_DECIMALS);
        
        if (currentValue >= _state.totalUSDInvested) {
            return int256(((currentValue - _state.totalUSDInvested) * 10000) / _state.totalUSDInvested);
        } else {
            return -int256(((_state.totalUSDInvested - currentValue) * 10000) / _state.totalUSDInvested);
        }
    }
}
