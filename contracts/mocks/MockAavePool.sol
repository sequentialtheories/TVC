// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockAavePool {
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrowings;
    
    uint256 public constant SUPPLY_RATE = 500; // 5% APY
    uint256 public constant BORROW_RATE = 800; // 8% APY
    
    event Supply(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event Withdraw(address indexed asset, uint256 amount, address indexed to);
    event Borrow(address indexed asset, uint256 amount, address indexed onBehalfOf);
    event Repay(address indexed asset, uint256 amount, address indexed onBehalfOf);
    
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        deposits[onBehalfOf] += amount;
        emit Supply(asset, amount, onBehalfOf);
    }
    
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        deposits[msg.sender] -= amount;
        IERC20(asset).transfer(to, amount);
        emit Withdraw(asset, amount, to);
        return amount;
    }
    
    function borrow(address asset, uint256 amount, uint256, uint16, address onBehalfOf) external {
        require(deposits[onBehalfOf] >= amount * 150 / 100, "Insufficient collateral");
        borrowings[onBehalfOf] += amount;
        IERC20(asset).transfer(msg.sender, amount);
        emit Borrow(asset, amount, onBehalfOf);
    }
    
    function repay(address asset, uint256 amount, uint256, address onBehalfOf) external returns (uint256) {
        uint256 repayAmount = amount > borrowings[onBehalfOf] ? borrowings[onBehalfOf] : amount;
        borrowings[onBehalfOf] -= repayAmount;
        IERC20(asset).transferFrom(msg.sender, address(this), repayAmount);
        emit Repay(asset, repayAmount, onBehalfOf);
        return repayAmount;
    }
    
    function getReserveData(address) external pure returns (
        uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint40
    ) {
        return (0, 0, 0, 0, SUPPLY_RATE, 0, 0, BORROW_RATE, 0, 0, 0, 0);
    }
    
    function getUserAccountData(address user) external view returns (
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 availableBorrowsBase,
        uint256 currentLiquidationThreshold,
        uint256 ltv,
        uint256 healthFactor
    ) {
        totalCollateralBase = deposits[user];
        totalDebtBase = borrowings[user];
        availableBorrowsBase = totalCollateralBase * 80 / 100;
        currentLiquidationThreshold = 8500;
        ltv = 8000;
        healthFactor = totalDebtBase > 0 ? (totalCollateralBase * 85 / 100 * 1e18) / totalDebtBase : type(uint256).max;
    }
}
