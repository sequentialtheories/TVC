// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMegaVaultFactory {
    // Enums
    enum RigorLevel { LIGHT, MEDIUM, HEAVY }
    
    // Events
    event SubClubCreated(
        address indexed subClub,
        address[] members,
        uint256 lockPeriod,
        RigorLevel rigor
    );
    event GlobalFeeUpdated(uint256 newFee);
    event EmergencyPause(bool paused);
    
    // Structs
    struct SubClubConfig {
        address[] members;
        uint256 lockPeriod;
        RigorLevel rigor;
        uint256 weeklyAmount;
        bool isCharged;
    }
    
    // Core Functions
    function createSubClub(
        address[] memory members,
        uint256 lockPeriod,
        RigorLevel rigor,
        bool isCharged
    ) external returns (address);
    
    function getSubClub(address user) external view returns (address);
    function isSubClub(address addr) external view returns (bool);
    function toggleEmergencyPause() external;
    function getGlobalFee() external view returns (uint256);
    function getMegaVault() external view returns (address);
    function setGlobalFee(uint256 newFee) external;
}
