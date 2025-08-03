// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEmergencyModule {
    // Events
    event EmergencyPaused(address indexed caller, string reason);
    event EmergencyUnpaused(address indexed caller);
    event EmergencyWithdrawal(
        address indexed token,
        uint256 amount,
        address indexed recipient
    );
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event MultisigThresholdUpdated(uint256 newThreshold);
    event EmergencyActionExecuted(
        bytes32 indexed actionId,
        address indexed executor,
        string actionType
    );
    
    // Structs
    struct EmergencyState {
        bool isPaused;
        uint256 pauseTime;
        string pauseReason;
        address pausedBy;
        uint256 totalPauses;
    }
    
    struct GuardianInfo {
        address guardian;
        bool isActive;
        uint256 addedTime;
        uint256 actionsExecuted;
    }
    
    struct MultisigConfig {
        address[] guardians;
        uint256 threshold;
        uint256 timelock;
        mapping(bytes32 => uint256) actionTimestamps;
        mapping(bytes32 => uint256) approvalCounts;
        mapping(bytes32 => mapping(address => bool)) approvals;
    }
    
    // Core Emergency Functions
    function emergencyPause(string calldata reason) external;
    function emergencyUnpause() external;
    function emergencyWithdraw(
        address token,
        uint256 amount,
        address recipient
    ) external;
    function emergencyStop() external;
    
    // Multisig Functions
    function proposeAction(
        bytes32 actionId,
        string calldata actionType,
        bytes calldata actionData
    ) external;
    function approveAction(bytes32 actionId) external;
    function executeAction(bytes32 actionId) external;
    function cancelAction(bytes32 actionId) external;
    
    // Guardian Management
    function addGuardian(address guardian) external;
    function removeGuardian(address guardian) external;
    function updateThreshold(uint256 newThreshold) external;
    function updateTimelock(uint256 newTimelock) external;
    
    // View Functions
    function getEmergencyState() external view returns (EmergencyState memory);
    function isGuardian(address account) external view returns (bool);
    function getGuardians() external view returns (address[] memory);
    function getThreshold() external view returns (uint256);
    function getTimelock() external view returns (uint256);
    function getActionStatus(bytes32 actionId) external view returns (
        uint256 approvals,
        uint256 timestamp,
        bool executed
    );
    
    // Access Control
    function hasEmergencyRole(address account) external view returns (bool);
    function canExecuteEmergency(address account) external view returns (bool);
    function isValidEmergencyAction(bytes32 actionId) external view returns (bool);
    
    // Integration Functions
    function notifyContractPaused(address contractAddress) external;
    function validateEmergencyCall(address caller, bytes4 selector) external view returns (bool);
    function getEmergencyContacts() external view returns (address[] memory);
}
