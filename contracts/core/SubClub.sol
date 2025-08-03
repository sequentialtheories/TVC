// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/ISubClub.sol";

import "../interfaces/IMegaVault.sol";
import "../interfaces/IEmergencyModule.sol";

contract SubClub is ISubClub, Ownable, ReentrancyGuard, Pausable {
    // State variables
    mapping(address => MemberInfo) public members;
    address[] public memberList;
    
    uint256 public lockPeriod;
    RigorLevel public rigorLevel;
    uint256 public weeklyDepositAmount;
    uint256 public totalDeposited;
    uint256 public totalShares;
    uint256 public contractStartTime;
    uint256 public lastDepositWeek;
    uint256 public globalFee;
    
    address public megaVault;
    address public emergencyModule;
    IERC20 public depositToken; // USDC
    
    bool public phase2Active;
    uint256 public phase2TriggerTime;
    
    // Constants
    uint256 public constant WEEK_DURATION = 7 days;
    uint256 public constant PENALTY_PERCENTAGE = 300; // 3% in basis points
    uint256 public constant MAX_MISSED_DEPOSITS = 3;
    
    // Modifiers
    modifier onlyMember() {
        require(members[msg.sender].isActive, "Not an active member");
        _;
    }
    
    modifier onlyMegaVault() {
        require(msg.sender == megaVault, "Only MegaVault");
        _;
    }
    
    modifier onlyEmergencyModule() {
        require(msg.sender == emergencyModule, "Only EmergencyModule");
        _;
    }
    
    modifier depositPeriodActive() {
        require(block.timestamp < contractStartTime + lockPeriod, "Deposit period ended");
        _;
    }
    
    // Constructor
    constructor(
        address[] memory _members,
        uint256 _lockPeriod,
        RigorLevel _rigorLevel,
        address _megaVault,
        address _emergencyModule,
        uint256 _globalFee
    ) {
        require(_members.length >= 4 && _members.length <= 8, "Invalid member count");
        require(_lockPeriod >= 365 days && _lockPeriod <= 20 * 365 days, "Invalid lock period");
        require(_megaVault != address(0), "Invalid MegaVault address");
        require(_emergencyModule != address(0), "Invalid EmergencyModule address");
        
        lockPeriod = _lockPeriod;
        rigorLevel = _rigorLevel;
        megaVault = _megaVault;
        emergencyModule = _emergencyModule;
        globalFee = _globalFee;
        contractStartTime = block.timestamp;
        
        // Set weekly deposit amount based on rigor level
        weeklyDepositAmount = _getWeeklyDepositAmount(_rigorLevel, _lockPeriod);
        
        // Initialize members
        for (uint256 i = 0; i < _members.length; i++) {
            require(_members[i] != address(0), "Invalid member address");
            
            members[_members[i]] = MemberInfo({
                totalDeposited: 0,
                sharePercentage: 10000 / _members.length, // Equal shares initially
                missedDeposits: 0,
                lastDepositWeek: 0,
                isActive: true,
                joinedAt: block.timestamp
            });
            
            memberList.push(_members[i]);
        }
        
        // Set deposit token (USDC on Polygon)
        depositToken = IERC20(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174); // USDC on Polygon mainnet
        // For Amoy testnet, this would be the testnet USDC address
        
        emit SubClubCreated(_members, _lockPeriod, _rigorLevel);
    }
    
    /**
     * @dev Make weekly deposit
     */
    function makeDeposit() external override onlyMember nonReentrant depositPeriodActive {
        uint256 currentWeek = getCurrentWeek();
        MemberInfo storage member = members[msg.sender];
        
        require(member.lastDepositWeek < currentWeek, "Already deposited this week");
        
        // Transfer deposit amount from member
        require(
            depositToken.transferFrom(msg.sender, address(this), weeklyDepositAmount),
            "Transfer failed"
        );
        
        // Update member info
        member.totalDeposited += weeklyDepositAmount;
        member.lastDepositWeek = currentWeek;
        
        // Update contract totals
        totalDeposited += weeklyDepositAmount;
        
        // Forward to MegaVault
        depositToken.approve(megaVault, weeklyDepositAmount);
        IMegaVault(megaVault).receiveDeposit(address(this), weeklyDepositAmount);
        
        emit DepositMade(msg.sender, weeklyDepositAmount, currentWeek);
        
        // Check if Phase 2 should be triggered
        _checkPhase2Trigger();
    }
    
    /**
     * @dev Process missed deposits and apply penalties
     */
    function processMissedDeposits() external override {
        uint256 currentWeek = getCurrentWeek();
        
        for (uint256 i = 0; i < memberList.length; i++) {
            address memberAddr = memberList[i];
            MemberInfo storage member = members[memberAddr];
            
            if (member.isActive && member.lastDepositWeek < currentWeek - 1) {
                uint256 missedWeeks = currentWeek - member.lastDepositWeek - 1;
                member.missedDeposits += missedWeeks;
                
                // Apply penalties for missed deposits
                if (member.missedDeposits >= MAX_MISSED_DEPOSITS) {
                    uint256 penaltyAmount = (member.sharePercentage * PENALTY_PERCENTAGE) / 10000;
                    member.sharePercentage -= penaltyAmount;
                    
                    emit PenaltyApplied(memberAddr, penaltyAmount, member.missedDeposits);
                    
                    // Reset missed deposits counter after penalty
                    member.missedDeposits = 0;
                }
                
                member.lastDepositWeek = currentWeek - 1;
            }
        }
    }
    
    /**
     * @dev Emergency withdrawal - member gets only their deposits back
     */
    function emergencyWithdraw() external override onlyMember nonReentrant {
        MemberInfo storage member = members[msg.sender];
        require(member.isActive, "Member not active");
        
        uint256 withdrawAmount = member.totalDeposited;
        require(withdrawAmount > 0, "No deposits to withdraw");
        
        // Deactivate member
        member.isActive = false;
        
        // Request withdrawal from MegaVault
        IMegaVault(megaVault).processEmergencyWithdrawal(address(this), msg.sender, withdrawAmount);
        
        emit EmergencyWithdrawal(msg.sender, withdrawAmount);
    }
    
    /**
     * @dev Trigger Phase 2 transition
     */
    function triggerPhase2() external override onlyMegaVault {
        require(!phase2Active, "Phase 2 already active");
        
        phase2Active = true;
        phase2TriggerTime = block.timestamp;
        
        emit Phase2Triggered(block.timestamp);
    }
    
    /**
     * @dev Distribute profits to members
     */
    function distributeProfits(uint256 totalProfits) external override onlyMegaVault {
        require(totalProfits > 0, "No profits to distribute");
        
        for (uint256 i = 0; i < memberList.length; i++) {
            address memberAddr = memberList[i];
            MemberInfo storage member = members[memberAddr];
            
            if (member.isActive) {
                uint256 memberProfit = (totalProfits * member.sharePercentage) / 10000;
                // Profits are tracked in the MegaVault, not transferred here
                
                emit ProfitDistributed(memberAddr, memberProfit);
            }
        }
    }
    
    /**
     * @dev Get current week number since contract start
     */
    function getCurrentWeek() public view override returns (uint256) {
        return (block.timestamp - contractStartTime) / WEEK_DURATION;
    }
    
    /**
     * @dev Get member information
     */
    function getMemberInfo(address member) external view override returns (MemberInfo memory) {
        return members[member];
    }
    
    /**
     * @dev Get contract information
     */
    function getContractInfo() external view override returns (ContractInfo memory) {
        return ContractInfo({
            members: memberList,
            lockPeriod: lockPeriod,
            rigor: rigorLevel,
            weeklyAmount: weeklyDepositAmount,
            isCharged: false, // TODO: Implement charged contract logic
            startTime: contractStartTime,
            currentPhase: phase2Active ? ISubClub.Phase.PHASE_2 : ISubClub.Phase.PHASE_1,
            isCompleted: block.timestamp >= contractStartTime + lockPeriod,
            totalValue: totalDeposited // Simplified - actual value would come from MegaVault
        });
    }
    
    /**
     * @dev Check if member can make deposit this week
     */
    function canMakeDeposit(address member) external view override returns (bool) {
        if (!members[member].isActive) return false;
        if (block.timestamp >= contractStartTime + lockPeriod) return false;
        
        uint256 currentWeek = getCurrentWeek();
        return members[member].lastDepositWeek < currentWeek;
    }
    
    /**
     * @dev Get all member addresses
     */
    function getAllMembers() external view override returns (address[] memory) {
        return memberList;
    }
    
    /**
     * @dev Check Phase 2 trigger conditions
     */
    function shouldTriggerPhase2() external view override returns (bool) {
        return _shouldTriggerPhase2Internal();
    }
    
    // Internal functions
    
    /**
     * @dev Get weekly deposit amount based on rigor level and lock period
     */
    function _getWeeklyDepositAmount(RigorLevel _rigor, uint256 _lockPeriod) internal pure returns (uint256) {
        uint256 lockYears = _lockPeriod / (365 days);
        
        if (_rigor == RigorLevel.LIGHT) {
            return 100 * 1e6; // $100 USDC (6 decimals)
        } else if (_rigor == RigorLevel.MEDIUM) {
            if (lockYears <= 3) return 50 * 1e6;
            else if (lockYears <= 6) return 100 * 1e6;
            else if (lockYears <= 10) return 150 * 1e6;
            else return 200 * 1e6;
        } else { // HEAVY
            if (lockYears <= 3) return 100 * 1e6;
            else if (lockYears <= 6) return 200 * 1e6;
            else if (lockYears <= 10) return 300 * 1e6;
            else return 400 * 1e6;
        }
    }
    
    /**
     * @dev Get count of active members
     */
    function _getActiveMemberCount() internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < memberList.length; i++) {
            if (members[memberList[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @dev Check if Phase 2 should be triggered
     */
    function _checkPhase2Trigger() internal {
        if (!phase2Active && _shouldTriggerPhase2Internal()) {
            IMegaVault(megaVault).requestPhase2Transition(address(this));
        }
    }
    
    /**
     * @dev Internal function to check Phase 2 trigger conditions
     */
    function _shouldTriggerPhase2Internal() internal view returns (bool) {
        if (phase2Active) return false;
        
        // Condition 1: 50% time elapsed
        bool timeCondition = block.timestamp >= contractStartTime + (lockPeriod / 2);
        
        // Condition 2: Contract value reaches ~$2M (simplified check)
        bool valueCondition = totalDeposited >= 2000000 * 1e6; // $2M in USDC (6 decimals)
        
        return timeCondition || valueCondition;
    }
    
    // Emergency functions
    
    /**
     * @dev Pause contract (emergency only)
     */
    function pause() external onlyEmergencyModule {
        _pause();
    }
    
    /**
     * @dev Unpause contract (emergency only)
     */
    function unpause() external onlyEmergencyModule {
        _unpause();
    }
    
    /**
     * @dev Update deposit token address (emergency only)
     */
    function updateDepositToken(address newToken) external onlyOwner {
        require(newToken != address(0), "Invalid token address");
        depositToken = IERC20(newToken);
    }
}
