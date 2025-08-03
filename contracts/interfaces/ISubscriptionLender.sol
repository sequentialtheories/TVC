// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISubscriptionLender {
    // Events
    event LoanIssued(
        address indexed borrower,
        uint256 loanAmount,
        uint256 collateralAmount,
        uint256 interestRate
    );
    event LoanRepaid(address indexed borrower, uint256 amount, uint256 interest);
    event CollateralLiquidated(address indexed borrower, uint256 amount);
    event InterestRateUpdated(uint256 newRate);
    event CollateralRatioUpdated(uint256 newRatio);
    
    // Structs
    struct LoanInfo {
        uint256 principal;
        uint256 collateral;
        uint256 interestRate;
        uint256 startTime;
        uint256 lastPaymentTime;
        uint256 totalInterest;
        bool isActive;
        address borrower;
    }
    
    struct LenderConfig {
        uint256 baseInterestRate;
        uint256 collateralRatio;      // 150% default
        uint256 liquidationThreshold; // 120% default
        uint256 maxLoanAmount;
        uint256 minCollateralAmount;
        bool isActive;
    }
    
    struct PoolState {
        uint256 totalLiquidity;
        uint256 totalLoaned;
        uint256 totalCollateral;
        uint256 availableLiquidity;
        uint256 utilizationRate;
    }
    
    // Core Functions
    function requestLoan(
        uint256 loanAmount,
        uint256 collateralAmount
    ) external returns (uint256 loanId);
    
    function repayLoan(uint256 loanId, uint256 amount) external;
    function liquidateCollateral(uint256 loanId) external;
    function addLiquidity(uint256 amount) external;
    function removeLiquidity(uint256 amount) external;
    
    // View Functions
    function getLoanInfo(uint256 loanId) external view returns (LoanInfo memory);
    function getLenderConfig() external view returns (LenderConfig memory);
    function getPoolState() external view returns (PoolState memory);
    function calculateInterest(uint256 loanId) external view returns (uint256);
    function isLiquidatable(uint256 loanId) external view returns (bool);
    function getMaxLoanAmount(uint256 collateral) external view returns (uint256);
    
    // Configuration Functions
    function updateInterestRate(uint256 newRate) external;
    function updateCollateralRatio(uint256 newRatio) external;
    function updateLiquidationThreshold(uint256 newThreshold) external;
    function setMaxLoanAmount(uint256 amount) external;
    
    // Integration Functions
    function notifyDeposit(address subClub, uint256 amount) external;
    function validateCollateral(address token, uint256 amount) external view returns (bool);
    function getCollateralValue(address token, uint256 amount) external view returns (uint256);
    
    // Emergency Functions
    function emergencyPause() external;
    function emergencyUnpause() external;
    function emergencyLiquidateAll() external;
}
