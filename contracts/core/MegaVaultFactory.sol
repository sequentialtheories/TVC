// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IMegaVaultFactory.sol";
import "../interfaces/ISubClub.sol";
import "../interfaces/IMegaVault.sol";
import "../interfaces/IEmergencyModule.sol";
import "./SubClub.sol";

contract MegaVaultFactory is IMegaVaultFactory, Ownable, ReentrancyGuard {
    // State variables
    mapping(address => address) public userToSubClub;
    mapping(address => bool) public isValidSubClub;
    address[] public allSubClubs;
    
    uint256 public globalFee = 100; // 1% in basis points
    address public megaVault;
    address public emergencyModule;
    bool public emergencyPaused;
    
    // Constants
    uint256 public constant MIN_MEMBERS = 1;
    uint256 public constant MAX_MEMBERS = 8;
    uint256 public constant MIN_LOCK_PERIOD = 365 days; // 1 year minimum
    uint256 public constant MAX_LOCK_PERIOD = 20 * 365 days; // 20 years maximum
    
    // Modifiers
    modifier notEmergencyPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }
    
    modifier validMemberCount(address[] memory members) {
        require(
            members.length >= MIN_MEMBERS && members.length <= MAX_MEMBERS,
            "Invalid member count"
        );
        _;
    }
    
    modifier validLockPeriod(uint256 lockPeriod, bool isCharged) {
        if (isCharged) {
            require(lockPeriod >= 30 days && lockPeriod <= 365 days, "Invalid charged contract lock period");
        } else {
            require(lockPeriod >= MIN_LOCK_PERIOD && lockPeriod <= MAX_LOCK_PERIOD, "Invalid traditional contract lock period");
        }
        _;
    }
    
    modifier noDuplicateMembers(address[] memory members) {
        for (uint256 i = 0; i < members.length; i++) {
            require(members[i] != address(0), "Invalid member address");
            require(userToSubClub[members[i]] == address(0), "Member already in subclub");
            
            // Check for duplicates within the array
            for (uint256 j = i + 1; j < members.length; j++) {
                require(members[i] != members[j], "Duplicate member");
            }
        }
        _;
    }
    
    // Constructor
    constructor(address _megaVault, address _emergencyModule) {
        require(_megaVault != address(0), "Invalid mega vault address");
        require(_emergencyModule != address(0), "Invalid emergency module address");
        
        megaVault = _megaVault;
        emergencyModule = _emergencyModule;
    }
    
    /**
     * @dev Create a new SubClub contract
     * @param members Array of member addresses (4-8 members)
     * @param lockPeriod Lock period in seconds (1-20 years)
     * @param rigor Rigor level (LIGHT, MEDIUM, HEAVY)
     * @return subClubAddress Address of the newly created SubClub
     */
    function createSubClub(
        address[] memory members,
        uint256 lockPeriod,
        RigorLevel rigor,
        bool isCharged
    ) 
        external 
        override
        nonReentrant
        notEmergencyPaused
        validMemberCount(members)
        validLockPeriod(lockPeriod, isCharged)
        noDuplicateMembers(members)
        returns (address subClubAddress) 
    {
        SubClub newSubClub = new SubClub(
            members,
            lockPeriod,
            ISubClub.RigorLevel(uint8(rigor)),
            megaVault,
            emergencyModule,
            globalFee,
            isCharged
        );
        
        subClubAddress = address(newSubClub);
        
        // Update mappings
        isValidSubClub[subClubAddress] = true;
        allSubClubs.push(subClubAddress);
        
        // Map each member to this subclub
        for (uint256 i = 0; i < members.length; i++) {
            userToSubClub[members[i]] = subClubAddress;
        }
        
        emit SubClubCreated(subClubAddress, members, lockPeriod, rigor);
        
        return subClubAddress;
    }
    
    /**
     * @dev Set global fee for all new SubClubs
     * @param newFee New fee in basis points (e.g., 100 = 1%)
     */
    function setGlobalFee(uint256 newFee) external override onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        globalFee = newFee;
        emit GlobalFeeUpdated(newFee);
    }
    
    /**
     * @dev Get SubClub address for a user
     * @param user User address
     * @return SubClub address (zero address if not in any subclub)
     */
    function getSubClub(address user) external view override returns (address) {
        return userToSubClub[user];
    }
    
    /**
     * @dev Check if an address is a valid SubClub
     * @param addr Address to check
     * @return True if valid SubClub
     */
    function isSubClub(address addr) external view override returns (bool) {
        return isValidSubClub[addr];
    }
    
    /**
     * @dev Toggle emergency pause state
     */
    function toggleEmergencyPause() external override onlyOwner {
        emergencyPaused = !emergencyPaused;
        emit EmergencyPause(emergencyPaused);
    }
    
    /**
     * @dev Get current global fee
     * @return Current global fee in basis points
     */
    function getGlobalFee() external view override returns (uint256) {
        return globalFee;
    }
    
    /**
     * @dev Get MegaVault address
     * @return MegaVault contract address
     */
    function getMegaVault() external view override returns (address) {
        return megaVault;
    }
    
    /**
     * @dev Get total number of SubClubs created
     * @return Total SubClub count
     */
    function getSubClubCount() external view returns (uint256) {
        return allSubClubs.length;
    }
    
    /**
     * @dev Get SubClub address by index
     * @param index Index in the allSubClubs array
     * @return SubClub address
     */
    function getSubClubByIndex(uint256 index) external view returns (address) {
        require(index < allSubClubs.length, "Index out of bounds");
        return allSubClubs[index];
    }
    
    /**
     * @dev Update MegaVault address (emergency function)
     * @param newMegaVault New MegaVault address
     */
    function updateMegaVault(address newMegaVault) external onlyOwner {
        require(newMegaVault != address(0), "Invalid address");
        megaVault = newMegaVault;
    }
    
    /**
     * @dev Update EmergencyModule address (emergency function)
     * @param newEmergencyModule New EmergencyModule address
     */
    function updateEmergencyModule(address newEmergencyModule) external onlyOwner {
        require(newEmergencyModule != address(0), "Invalid address");
        emergencyModule = newEmergencyModule;
    }
}
