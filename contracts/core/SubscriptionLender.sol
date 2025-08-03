// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ISubscriptionLender.sol";
import "../libraries/VaultMath.sol";

contract SubscriptionLender is ISubscriptionLender, Ownable, ReentrancyGuard, Pausable {
    using VaultMath for uint256;
    
    // State variables
    PoolState private _poolState;
    LenderConfig private _config;
    address private _megaVault;
    address private _aavePool;
    address private _usdcToken;
    
    // Loan tracking
    mapping(address => LoanInfo) private _loans;
    mapping(address => uint256[]) private _userLoanIds;
    mapping(uint256 => LoanInfo) private _loanById;
    uint256 private _nextLoanId;
    
    // Constants
    uint256 private constant COLLATERAL_RATIO = 12000; // 120%
    uint256 private constant LIQUIDATION_THRESHOLD = 11000; // 110%
    uint256 private constant MAX_LTV = 8000; // 80%
    uint256 private constant INTEREST_RATE = 500; // 5% APY
    uint256 private constant MIN_LOAN_AMOUNT = 100 * 1e6; // 100 USDC
    uint256 private constant MAX_LOAN_DURATION = 365 days;
    
    // Events
    event LoanOriginated(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount,
        uint256 collateralAmount,
        uint256 interestRate
    );
    event SubscriptionUpdated(
        address indexed user,
        uint256 weeklyAmount,
        uint256 duration
    );
    
    // Modifiers
    modifier onlyMegaVault() {
        require(msg.sender == _megaVault, "Only MegaVault can call");
        _;
    }
    
    modifier validLoan(uint256 loanId) {
        require(loanId > 0 && loanId < _nextLoanId, "Invalid loan ID");
        require(_loanById[loanId].borrower != address(0), "Loan does not exist");
        _;
    }
    
    constructor(
        address megaVault,
        address aavePool,
        address usdcToken
    ) {
        require(megaVault != address(0), "Invalid MegaVault address");
        require(aavePool != address(0), "Invalid AAVE pool address");
        require(usdcToken != address(0), "Invalid USDC token address");
        
        _megaVault = megaVault;
        _aavePool = aavePool;
        _usdcToken = usdcToken;
        _nextLoanId = 1;
        
        // Initialize lender config
        _config = LenderConfig({
            baseInterestRate: INTEREST_RATE,
            collateralRatio: COLLATERAL_RATIO,
            liquidationThreshold: LIQUIDATION_THRESHOLD,
            maxLoanAmount: 1000000 * 1e6, // 1M USDC max
            minCollateralAmount: MIN_LOAN_AMOUNT,
            isActive: true
        });
        
        // Initialize pool state
        _poolState = PoolState({
            totalLiquidity: 0,
            totalLoaned: 0,
            totalCollateral: 0,
            availableLiquidity: 0,
            utilizationRate: 0
        });
    }
    
    // Core lending functions
    
    function requestLoan(
        uint256 loanAmount,
        uint256 collateralAmount
    ) external override nonReentrant whenNotPaused returns (uint256) {
        require(loanAmount >= MIN_LOAN_AMOUNT, "Amount below minimum");
        require(loanAmount <= _config.maxLoanAmount, "Amount exceeds maximum");
        require(collateralAmount >= _config.minCollateralAmount, "Insufficient collateral");
        
        // Calculate required collateral
        uint256 requiredCollateral = _calculateRequiredCollateral(loanAmount);
        require(collateralAmount >= requiredCollateral, "Insufficient collateral");
        
        // Validate loan-to-value ratio
        require(_validateLTV(loanAmount, collateralAmount), "LTV ratio too high");
        
        // Create loan
        uint256 loanId = _nextLoanId++;
        
        LoanInfo memory loan = LoanInfo({
            principal: loanAmount,
            collateral: collateralAmount,
            interestRate: _config.baseInterestRate,
            startTime: block.timestamp,
            lastPaymentTime: 0,
            totalInterest: 0,
            isActive: true,
            borrower: msg.sender
        });
        
        _loanById[loanId] = loan;
        _loans[msg.sender] = loan;
        _userLoanIds[msg.sender].push(loanId);
        
        // Update pool state
        _poolState.totalLoaned += loanAmount;
        _poolState.totalCollateral += collateralAmount;
        _poolState.availableLiquidity -= loanAmount;
        _updateUtilizationRate();
        
        // In production, this would:
        // 1. Transfer collateral from borrower
        // 2. Borrow from AAVE using collateral
        // 3. Transfer loan amount to borrower
        
        emit LoanIssued(msg.sender, loanAmount, collateralAmount, _config.baseInterestRate);
        
        return loanId;
    }
    
    function repayLoan(uint256 loanId, uint256 amount) external override nonReentrant validLoan(loanId) {
        LoanInfo storage loan = _loanById[loanId];
        require(loan.borrower == msg.sender, "Not loan borrower");
        require(loan.isActive, "Loan not active");
        require(amount > 0, "Invalid amount");
        
        // Calculate interest owed
        uint256 interestOwed = this.calculateInterest(loanId);
        uint256 totalOwed = loan.principal + interestOwed;
        require(amount <= totalOwed, "Amount exceeds debt");
        
        // In production, this would:
        // 1. Transfer repayment from borrower
        // 2. Repay AAVE loan
        // 3. Return collateral to borrower if fully repaid
        
        // Update loan state
        if (amount >= totalOwed) {
            // Full repayment
            loan.isActive = false;
            loan.totalInterest = interestOwed;
            loan.lastPaymentTime = block.timestamp;
            
            // Update pool state
            _poolState.totalLoaned -= loan.principal;
            _poolState.totalCollateral -= loan.collateral;
            _poolState.availableLiquidity += amount;
            
            emit LoanRepaid(msg.sender, loan.principal + interestOwed, interestOwed);
        } else {
            // Partial repayment
            loan.lastPaymentTime = block.timestamp;
            loan.totalInterest += amount;
            
            emit LoanRepaid(msg.sender, amount, amount);
        }
        
        _updateUtilizationRate();
    }
    
    function liquidateCollateral(uint256 loanId) external override nonReentrant validLoan(loanId) {
        LoanInfo storage loan = _loanById[loanId];
        require(loan.isActive, "Loan not active");
        require(this.isLiquidatable(loanId), "Loan not liquidatable");
        
        // Calculate liquidation amounts
        uint256 collateralValue = _getCollateralValue(loan.collateral);
        uint256 outstandingDebt = _getOutstandingDebt(loanId);
        
        // Execute liquidation
        uint256 recoveredAmount = collateralValue > outstandingDebt ? 
            outstandingDebt : collateralValue;
        
        // Update loan state
        loan.isActive = false;
        loan.totalInterest = recoveredAmount > loan.principal ? 
            recoveredAmount - loan.principal : 0;
        
        // Update pool state
        _poolState.totalLoaned -= loan.principal;
        _poolState.totalCollateral -= loan.collateral;
        _poolState.availableLiquidity += recoveredAmount;
        _updateUtilizationRate();
        
        emit CollateralLiquidated(loan.borrower, recoveredAmount);
    }
    
    // Liquidity management
    
    function addLiquidity(uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        
        // In production, this would transfer USDC from user
        _poolState.totalLiquidity += amount;
        _poolState.availableLiquidity += amount;
        _updateUtilizationRate();
    }
    
    function removeLiquidity(uint256 amount) external override nonReentrant {
        require(amount > 0, "Invalid amount");
        require(amount <= _poolState.availableLiquidity, "Insufficient liquidity");
        
        // In production, this would transfer USDC to user
        _poolState.totalLiquidity -= amount;
        _poolState.availableLiquidity -= amount;
        _updateUtilizationRate();
    }
    
    // View functions
    
    function getLoanInfo(uint256 loanId) external view override validLoan(loanId) returns (LoanInfo memory) {
        return _loanById[loanId];
    }
    
    function getLenderConfig() external view override returns (LenderConfig memory) {
        return _config;
    }
    
    function getPoolState() external view override returns (PoolState memory) {
        return _poolState;
    }
    
    function calculateInterest(uint256 loanId) external view override validLoan(loanId) returns (uint256) {
        LoanInfo memory loan = _loanById[loanId];
        
        // Calculate interest based on time elapsed
        uint256 timeElapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.principal * loan.interestRate * timeElapsed) / (365 days * 10000);
        
        return interest;
    }
    
    function isLiquidatable(uint256 loanId) external view override validLoan(loanId) returns (bool) {
        LoanInfo memory loan = _loanById[loanId];
        
        if (!loan.isActive) return false;
        
        // Check collateral ratio
        uint256 collateralValue = _getCollateralValue(loan.collateral);
        uint256 outstandingDebt = _getOutstandingDebt(loanId);
        
        if (collateralValue == 0) return true;
        
        uint256 collateralRatio = (collateralValue * 10000) / outstandingDebt;
        return collateralRatio < _config.liquidationThreshold;
    }
    
    function getMaxLoanAmount(uint256 collateral) external view override returns (uint256) {
        uint256 collateralValue = _getCollateralValue(collateral);
        return (collateralValue * MAX_LTV) / 10000;
    }
    
    // Internal helper functions
    
    function _calculateRequiredCollateral(uint256 loanAmount) internal view returns (uint256) {
        return (loanAmount * _config.collateralRatio) / 10000;
    }
    
    function _validateLTV(uint256 loanAmount, uint256 collateralAmount) internal view returns (bool) {
        uint256 collateralValue = _getCollateralValue(collateralAmount);
        if (collateralValue == 0) return false;
        
        uint256 ltv = (loanAmount * 10000) / collateralValue;
        return ltv <= MAX_LTV;
    }
    
    function _getCollateralValue(uint256 collateralAmount) internal pure returns (uint256) {
        // In production, this would get the current market value of the collateral
        // For now, assume 1:1 with USDC
        return collateralAmount;
    }
    
    function _getOutstandingDebt(uint256 loanId) internal view returns (uint256) {
        LoanInfo memory loan = _loanById[loanId];
        uint256 interest = (loan.principal * loan.interestRate * (block.timestamp - loan.startTime)) / (365 days * 10000);
        return loan.principal + interest;
    }
    
    function _updateUtilizationRate() internal {
        if (_poolState.totalLiquidity == 0) {
            _poolState.utilizationRate = 0;
        } else {
            _poolState.utilizationRate = (_poolState.totalLoaned * 10000) / _poolState.totalLiquidity;
        }
    }
    
    // Configuration functions
    
    function updateInterestRate(uint256 newRate) external override onlyOwner {
        require(newRate <= 2000, "Interest rate too high"); // Max 20%
        _config.baseInterestRate = newRate;
        emit InterestRateUpdated(newRate);
    }
    
    function updateCollateralRatio(uint256 newRatio) external override onlyOwner {
        require(newRatio >= 10000, "Collateral ratio too low"); // Min 100%
        _config.collateralRatio = newRatio;
        emit CollateralRatioUpdated(newRatio);
    }
    
    function updateLiquidationThreshold(uint256 newThreshold) external override onlyOwner {
        require(newThreshold > _config.collateralRatio, "Invalid liquidation threshold");
        _config.liquidationThreshold = newThreshold;
    }
    
    function setMaxLoanAmount(uint256 amount) external override onlyOwner {
        require(amount > 0, "Invalid amount");
        _config.maxLoanAmount = amount;
    }
    
    // Integration functions
    
    function notifyDeposit(address subClub, uint256 amount) external override onlyMegaVault {
        // Notify of SubClub deposit for liquidity tracking
        _poolState.totalLiquidity += amount;
        _poolState.availableLiquidity += amount;
        _updateUtilizationRate();
    }
    
    function validateCollateral(address token, uint256 amount) external view override returns (bool) {
        // In production, validate that the token is acceptable collateral
        return token == _usdcToken && amount >= _config.minCollateralAmount;
    }
    
    function getCollateralValue(address token, uint256 amount) external view override returns (uint256) {
        // In production, get market value of collateral token
        if (token == _usdcToken) {
            return amount; // 1:1 for USDC
        }
        return 0;
    }
    
    // Emergency functions
    
    function emergencyPause() external override onlyOwner {
        _pause();
        _config.isActive = false;
    }
    
    function emergencyUnpause() external override onlyOwner {
        _unpause();
        _config.isActive = true;
    }
    
    function emergencyLiquidateAll() external override onlyOwner whenPaused {
        // Emergency liquidation of all active loans
        // In production, this would liquidate all collateral
        _poolState.totalLoaned = 0;
        _poolState.totalCollateral = 0;
        _updateUtilizationRate();
    }
    
    // Admin functions
    
    function setMegaVault(address megaVault) external onlyOwner {
        require(megaVault != address(0), "Invalid MegaVault address");
        _megaVault = megaVault;
    }
    
    function setAAVEPool(address aavePool) external onlyOwner {
        require(aavePool != address(0), "Invalid AAVE pool address");
        _aavePool = aavePool;
    }
    
    function getTotalLoansOutstanding() external view returns (uint256) {
        return _poolState.totalLoaned;
    }
    
    function getTotalCollateralHeld() external view returns (uint256) {
        return _poolState.totalCollateral;
    }
    
    function getTotalInterestEarned() external view returns (uint256) {
        // Calculate total interest from all loans
        uint256 totalInterest = 0;
        for (uint256 i = 1; i < _nextLoanId; i++) {
            if (_loanById[i].borrower != address(0)) {
                totalInterest += _loanById[i].totalInterest;
            }
        }
        return totalInterest;
    }
    
    function getActiveLoansCount() external view returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i < _nextLoanId; i++) {
            if (_loanById[i].isActive) {
                activeCount++;
            }
        }
        return activeCount;
    }
}
