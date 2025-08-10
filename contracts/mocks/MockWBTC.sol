// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockWBTC is ERC20, Ownable {
    uint8 private _decimals;
    
    constructor() ERC20("Wrapped Bitcoin", "WBTC") {
        _decimals = 8; // WBTC uses 8 decimals like Bitcoin
        _mint(msg.sender, 1000 * 10**_decimals); // Mint 1000 WBTC for testing
    }
    
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
    
    function faucet(address to, uint256 amount) external {
        require(amount <= 10 * 10**_decimals, "Max 10 WBTC per faucet call");
        _mint(to, amount);
    }
}
