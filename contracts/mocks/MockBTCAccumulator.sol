// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IBTCAccumulator.sol";

contract MockBTCAccumulator is IBTCAccumulator {
    AccumulationState private _state;
    PriceData private _priceData;
    
    constructor() {
        _state = AccumulationState({
            totalUSDInvested: 0,
            totalBTCAccumulated: 0,
            averageBuyPrice: 50000 * 1e8, // $50,000
            weeklyDCAAmount: 1000 * 1e18, // $1,000
            lastPurchaseTime: 0,
            purchaseCount: 0,
            isActive: false
        });
        
        _priceData = PriceData({
            currentPrice: 50000 * 1e8, // $50,000
            lastUpdateTime: block.timestamp,
            oracle: address(0),
            isValid: true
        });
    }
    
    function executeDCA(uint256 usdAmount) external override {}
    
    function purchaseBTC(uint256 usdAmount) external override returns (uint256 btcReceived) {
        return (usdAmount * 1e8) / _priceData.currentPrice;
    }
    
    function completeAccumulation() external override {
        _state.isActive = false;
    }
    
    function withdrawBTC(uint256 amount, address recipient) external override {}
    
    function getAccumulationState() external view override returns (AccumulationState memory) {
        return _state;
    }
    
    function getCurrentBTCPrice() external view override returns (uint256) {
        return _priceData.currentPrice;
    }
    
    function getPriceData() external view override returns (PriceData memory) {
        return _priceData;
    }
    
    function getTotalValue() external view override returns (uint256) {
        return (_state.totalBTCAccumulated * _priceData.currentPrice) / 1e8;
    }
    
    function canExecuteDCA() external view override returns (bool) {
        return _state.isActive && block.timestamp >= _state.lastPurchaseTime + 1 weeks;
    }
    
    function getNextDCATime() external view override returns (uint256) {
        return _state.lastPurchaseTime + 1 weeks;
    }
    
    function getProfits() external view override returns (uint256) {
        uint256 currentValue = this.getTotalValue();
        return currentValue > _state.totalUSDInvested ? currentValue - _state.totalUSDInvested : 0;
    }
    
    function deposit(uint256 amount) external override {
        _state.totalUSDInvested += amount;
    }
    
    function withdraw(uint256 amount) external override {
        if (amount <= _state.totalUSDInvested) {
            _state.totalUSDInvested -= amount;
        }
    }
    
    function setWeeklyDCAAmount(uint256 amount) external override {
        _state.weeklyDCAAmount = amount;
    }
    
    function updatePriceOracle(address newOracle) external override {
        _priceData.oracle = newOracle;
    }
    
    function setPriceThreshold(uint256 threshold) external override {}
    
    function notifyPhaseTransition() external override {
        _state.isActive = true;
    }
    
    function requestBTCBalance() external view override returns (uint256) {
        return _state.totalBTCAccumulated;
    }
    
    function validatePurchase(uint256 usdAmount) external view override returns (bool) {
        return usdAmount > 0 && _priceData.isValid;
    }
    
    function emergencyPause() external override {
        _state.isActive = false;
    }
    
    function emergencyUnpause() external override {
        _state.isActive = true;
    }
    
    function emergencyWithdraw(uint256 amount) external override {}
}
