// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract VaultClub is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");

    struct MemberInfo {
        uint256 totalDeposited;
        uint256 lastDepositTime;
        bool isActive;
    }

    mapping(address => MemberInfo) public members;
    mapping(address => uint256) public balances;
    
    uint256 public totalDeposits;
    uint256 public totalMembers;
    uint8 public currentPhase = 1;
    uint256 public lastHarvestTime;
    uint256 public constant MIN_HARVEST_INTERVAL = 7 days;

    event Deposit(address indexed member, uint256 amount);
    event Harvest(uint256 timestamp, uint8 phase);
    event PhaseTransition(uint8 fromPhase, uint8 toPhase);
    event EmergencyWithdraw(address indexed member, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(HARVESTER_ROLE, msg.sender);
        lastHarvestTime = block.timestamp;
    }

    function deposit(uint256 amount) external payable nonReentrant whenNotPaused {
        require(msg.value > 0 || amount > 0, "Must deposit something");
        
        uint256 depositAmount = msg.value > 0 ? msg.value : amount;
        
        if (!members[msg.sender].isActive) {
            members[msg.sender].isActive = true;
            totalMembers++;
        }
        
        members[msg.sender].totalDeposited += depositAmount;
        members[msg.sender].lastDepositTime = block.timestamp;
        balances[msg.sender] += depositAmount;
        totalDeposits += depositAmount;
        
        emit Deposit(msg.sender, depositAmount);
    }

    function harvestAndRoute() external onlyRole(HARVESTER_ROLE) nonReentrant whenNotPaused {
        require(block.timestamp >= lastHarvestTime + MIN_HARVEST_INTERVAL, "Too early to harvest");
        
        lastHarvestTime = block.timestamp;
        
        // Simple phase transition logic
        if (currentPhase == 1 && totalDeposits >= 100 ether) {
            currentPhase = 2;
            emit PhaseTransition(1, 2);
        }
        
        emit Harvest(block.timestamp, currentPhase);
    }

    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        require(amount > 0, "Amount must be greater than 0");
        
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        payable(msg.sender).transfer(amount);
    }

    function emergencyWithdraw() external nonReentrant {
        uint256 balance = balances[msg.sender];
        require(balance > 0, "No balance to withdraw");
        
        balances[msg.sender] = 0;
        totalDeposits -= balance;
        members[msg.sender].isActive = false;
        totalMembers--;
        
        payable(msg.sender).transfer(balance);
        emit EmergencyWithdraw(msg.sender, balance);
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function getTotalMembers() external view returns (uint256) {
        return totalMembers;
    }

    function getMemberInfo(address member) external view returns (uint256, uint256, bool) {
        MemberInfo memory info = members[member];
        return (info.totalDeposited, info.lastDepositTime, info.isActive);
    }

    function getVaultStats() external view returns (uint256, uint256, uint256, uint256) {
        return (totalDeposits, totalMembers, currentPhase, lastHarvestTime);
    }

    function getCurrentPhase() external view returns (uint8) {
        return currentPhase;
    }

    function getStrandAllocation(uint8 strand) external pure returns (uint256) {
        if (strand == 1) return 10; // 10% for capital strand
        if (strand == 2) return 45; // 45% for growth strand
        if (strand == 3) return 45; // 45% for speculation strand
        return 0;
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    receive() external payable {
        deposit(0);
    }
}
