// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockQuickSwapRouter {
    mapping(address => mapping(address => uint256)) public liquidityPools;
    mapping(address => uint256) public tokenPrices;
    
    uint256 public constant FEE_RATE = 30; // 0.3%
    
    event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event Swap(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    
    constructor() {
        tokenPrices[address(0)] = 1e18; // Default price 1:1
    }
    
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(amountADesired >= amountAMin && amountBDesired >= amountBMin, "Insufficient amounts");
        
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);
        
        liquidityPools[tokenA][tokenB] += amountADesired;
        liquidityPools[tokenB][tokenA] += amountBDesired;
        
        amountA = amountADesired;
        amountB = amountBDesired;
        liquidity = (amountA * amountB) / 1e18;
        
        emit LiquidityAdded(tokenA, tokenB, amountA, amountB);
    }
    
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256
    ) external returns (uint256 amountA, uint256 amountB) {
        uint256 totalLiquidity = (liquidityPools[tokenA][tokenB] * liquidityPools[tokenB][tokenA]) / 1e18;
        require(totalLiquidity > 0, "No liquidity");
        
        amountA = (liquidity * liquidityPools[tokenA][tokenB]) / totalLiquidity;
        amountB = (liquidity * liquidityPools[tokenB][tokenA]) / totalLiquidity;
        
        require(amountA >= amountAMin && amountB >= amountBMin, "Insufficient amounts");
        
        liquidityPools[tokenA][tokenB] -= amountA;
        liquidityPools[tokenB][tokenA] -= amountB;
        
        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
        
        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB);
    }
    
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256
    ) external returns (uint256[] memory amounts) {
        require(path.length >= 2, "Invalid path");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            uint256 amountOut = getAmountOut(amounts[i], path[i], path[i + 1]);
            amounts[i + 1] = amountOut;
        }
        
        require(amounts[amounts.length - 1] >= amountOutMin, "Insufficient output amount");
        
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[path.length - 1]).transfer(to, amounts[amounts.length - 1]);
        
        emit Swap(path[0], path[path.length - 1], amountIn, amounts[amounts.length - 1]);
    }
    
    function getAmountOut(uint256 amountIn, address tokenIn, address tokenOut) public view returns (uint256) {
        uint256 reserveIn = liquidityPools[tokenIn][tokenOut];
        uint256 reserveOut = liquidityPools[tokenOut][tokenIn];
        
        if (reserveIn == 0 || reserveOut == 0) {
            return (amountIn * 99) / 100; // 1% slippage for mock
        }
        
        uint256 amountInWithFee = amountIn * (10000 - FEE_RATE);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 10000) + amountInWithFee;
        
        return numerator / denominator;
    }
    
    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            amounts[i + 1] = getAmountOut(amounts[i], path[i], path[i + 1]);
        }
    }
    
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) external pure returns (uint256 amountB) {
        require(amountA > 0 && reserveA > 0 && reserveB > 0, "Invalid amounts");
        amountB = (amountA * reserveB) / reserveA;
    }
}
