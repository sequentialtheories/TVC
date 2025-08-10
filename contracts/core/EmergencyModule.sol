// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract EmergencyModule is Ownable, Pausable, ReentrancyGuard {
    // State variables
    mapping(address => bool) public authorizedContracts;
    mapping(address => bool) public emergencyAdmins;
    uint256 public constant EMERGENCY_DELAY = 24 hours;
    mapping(address => uint256) public emergencyRequests;
    
    // Events
    event EmergencyAdminAdded(address admin);
    event EmergencyAdminRemoved(address admin);
    event EmergencyRequested(address requester, uint256 executeTime);
    event EmergencyExecuted(address executor);
    event ContractAuthorized(address contractAddress);
    event ContractDeauthorized(address contractAddress);
    
    // Modifiers
    modifier onlyEmergencyAdmin() {
        require(
            emergencyAdmins[msg.sender] || msg.sender == owner(),
            "Not emergency admin"
        );
        _;
    }
    
    modifier onlyAuthorizedContract() {
        require(authorizedContracts[msg.sender], "Not authorized contract");
        _;
    }
    
    // Constructor
    constructor() {
        emergencyAdmins[msg.sender] = true;
    }
    
    // Admin functions
    function addEmergencyAdmin(address admin) external onlyOwner {
        require(admin != address(0), "Invalid address");
        emergencyAdmins[admin] = true;
        emit EmergencyAdminAdded(admin);
    }
    
    function removeEmergencyAdmin(address admin) external onlyOwner {
        emergencyAdmins[admin] = false;
        emit EmergencyAdminRemoved(admin);
    }
    
    function authorizeContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        authorizedContracts[contractAddress] = true;
        emit ContractAuthorized(contractAddress);
    }
    
    function deauthorizeContract(address contractAddress) external onlyOwner {
        authorizedContracts[contractAddress] = false;
        emit ContractDeauthorized(contractAddress);
    }
    
    // Emergency functions
    function requestEmergency() external onlyEmergencyAdmin {
        emergencyRequests[msg.sender] = block.timestamp + EMERGENCY_DELAY;
        emit EmergencyRequested(msg.sender, emergencyRequests[msg.sender]);
    }
    
    function executeEmergency() external onlyEmergencyAdmin nonReentrant {
        require(
            emergencyRequests[msg.sender] > 0 &&
            emergencyRequests[msg.sender] <= block.timestamp,
            "Emergency not ready"
        );
        emergencyRequests[msg.sender] = 0;
        _pause();
        emit EmergencyExecuted(msg.sender);
    }
    
    function cancelEmergency() external onlyEmergencyAdmin {
        emergencyRequests[msg.sender] = 0;
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // View functions
    function isEmergencyAdmin(address admin) external view returns (bool) {
        return emergencyAdmins[admin];
    }
    
    function isAuthorizedContract(address contractAddress) external view returns (bool) {
        return authorizedContracts[contractAddress];
    }
    
    function getEmergencyRequest(address admin) external view returns (uint256) {
        return emergencyRequests[admin];
    }
}
