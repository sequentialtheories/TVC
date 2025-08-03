// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IMegaVault.sol";
import "../interfaces/IStrandManager.sol";
import "../interfaces/IRRLEngine.sol";
import "../interfaces/IBTCAccumulator.sol";
import "../interfaces/IEmergencyModule.sol";
import "../libraries/VaultMath.sol";
import "../libraries/RRLCalculations.sol";

contract MegaVault is IMegaVault, Ownable, ReentrancyGuard, Pausable {
    // State variables
    mapping(address => bool) public registeredSubClubs;
    address[] public subClubList;
    
    VaultState public vaultState;
    StrandAllocation public currentAllocation;
    
    // Contract addresses
    address public strandManagerCapital;
    address public strandManagerYield;
    address public strandManagerMomentum;
    address public rrlEngine;
    address public btcAccumulator;
    address public emergencyModule;
    
    // Constants
    uint256 public constant HARVEST_INTERVAL = 7 days; // Weekly harvest
    uint256 public constant PHASE_2_TRIGGER_PERCENTAGE = 50; // 50% completion
    uint256 public constant PHASE_2_VALUE_THRESHOLD = 2000000 * 1e6; // $2M in USDC
    
    // Modifiers
    modifier onlyRegisteredSubClub() {
        require(registeredSubClubs[msg.sender], "Not registered SubClub");
        _;
    }
    
    modifier onlyEmergencyModule() {
        require(msg.sender == emergencyModule, "Not emergency module");
        _;
    }
    
    modifier harvestReady() {
        require(canHarvest(), "Harvest not ready");
        _;
    }
    
    // Constructor
    constructor(
        address _strandManagerCapital,
        address _strandManagerYield,
        address _strandManagerMomentum,
        address _rrlEngine,
        address _btcAccumulator,
        address _emergencyModule
    ) {
        require(_strandManagerCapital != address(0), "Invalid capital strand manager");
        require(_strandManagerYield != address(0), "Invalid yield strand manager");
        require(_strandManagerMomentum != address(0), "Invalid momentum strand manager");
        require(_rrlEngine != address(0), "Invalid RRL engine");
        require(_btcAccumulator != address(0), "Invalid BTC accumulator");
        require(_emergencyModule != address(0), "Invalid emergency module");
        
        strandManagerCapital = _strandManagerCapital;
        strandManagerYield = _strandManagerYield;
        strandManagerMomentum = _strandManagerMomentum;
        rrlEngine = _rrlEngine;
        btcAccumulator = _btcAccumulator;
        emergencyModule = _emergencyModule;
        
        // Initialize vault state
        vaultState.currentPhase = Phase.PHASE_1;
        vaultState.lastHarvestTime = block.timestamp;
        
        // Initialize Phase 1 allocation (10%, 60%, 30%)
        currentAllocation.capitalStrand = 1000; // 10%
        currentAllocation.yieldStrand = 6000;   // 60%
        currentAllocation.momentumStrand = 3000; // 30%
        currentAllocation.bitcoinStrand = 0;     // 0% in Phase 1
    }
    
    /**
     * @dev Direct deposit function (required by interface)
     */
    function deposit(uint256 amount) external override nonReentrant whenNotPaused {
        require(amount > 0, "Invalid deposit amount");
        require(registeredSubClubs[msg.sender], "Not registered SubClub");
        
        vaultState.totalDeposits += amount;
        _distributeToStrands(amount);
        
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * @dev Receive deposit from SubClub
     */
    function receiveDeposit(address subClub, uint256 amount) external override onlyRegisteredSubClub nonReentrant whenNotPaused {
        require(amount > 0, "Invalid deposit amount");
        
        vaultState.totalDeposits += amount;
        
        // Distribute to strands based on current allocation
        _distributeToStrands(amount);
        
        // Update total value after distribution
        vaultState.totalValue = _calculateTotalValue();
        
        emit DepositReceived(subClub, amount);
    }
    
    /**
     * @dev Execute weekly harvest cycle
     */
    function executeHarvest() external override harvestReady nonReentrant whenNotPaused {
        uint256 totalProfits = _calculateTotalProfits();
        
        if (totalProfits > 0) {
            // Execute RRL logic for profit redistribution
            // Create strand performance data for RRL engine
            IRRLEngine.StrandPerformance[] memory strandData = new IRRLEngine.StrandPerformance[](3);
            strandData[0] = IRRLEngine.StrandPerformance({
                strandId: 0,
                currentValue: IStrandManager(strandManagerCapital).getTotalValue(),
                targetValue: VaultMath.calculatePercentage(vaultState.totalValue, currentAllocation.capitalStrand),
                actualAPY: 500, // 5% - placeholder
                targetAPY: 500,
                performanceRatio: 10000 // 100% - placeholder
            });
            strandData[1] = IRRLEngine.StrandPerformance({
                strandId: 1,
                currentValue: IStrandManager(strandManagerYield).getTotalValue(),
                targetValue: VaultMath.calculatePercentage(vaultState.totalValue, currentAllocation.yieldStrand),
                actualAPY: 1000, // 10% - placeholder
                targetAPY: 1000,
                performanceRatio: 10000 // 100% - placeholder
            });
            strandData[2] = IRRLEngine.StrandPerformance({
                strandId: 2,
                currentValue: IStrandManager(strandManagerMomentum).getTotalValue(),
                targetValue: VaultMath.calculatePercentage(vaultState.totalValue, currentAllocation.momentumStrand),
                actualAPY: 1500, // 15% - placeholder
                targetAPY: 1500,
                performanceRatio: 10000 // 100% - placeholder
            });
            
            IRRLEngine.RRLResult memory result = IRRLEngine(rrlEngine).executeRRL(totalProfits, strandData);
            
            // Update vault state
            vaultState.totalValue = _calculateTotalValue();
            vaultState.harvestCount++;
        }
        
        vaultState.lastHarvestTime = block.timestamp;
        
        emit HarvestExecuted(totalProfits, block.timestamp);
        
        // Check if Phase 2 should be triggered
        if (shouldTransitionPhase2()) {
            transitionToPhase2();
        }
    }
    
    /**
     * @dev Transition to Phase 2 (wBTC accumulation)
     */
    function transitionToPhase2() public override onlyOwner {
        require(vaultState.currentPhase == Phase.PHASE_1, "Already in Phase 2");
        require(shouldTransitionPhase2(), "Phase 2 conditions not met");
        
        vaultState.currentPhase = Phase.PHASE_2;
        
        // Update allocation for Phase 2 (100% Bitcoin)
        currentAllocation.capitalStrand = 0;
        currentAllocation.yieldStrand = 0;
        currentAllocation.momentumStrand = 0;
        currentAllocation.bitcoinStrand = 10000; // 100%
        
        // Notify BTC accumulator of phase transition
        IBTCAccumulator(btcAccumulator).notifyPhaseTransition();
        
        emit PhaseTransitioned(Phase.PHASE_2);
    }
    
    /**
     * @dev Rebalance strands according to RRL logic
     */
    function rebalanceStrands() external override onlyOwner nonReentrant {
        // Get rebalancing instructions from RRL engine
        // Create strand performance data for rebalancing
        IRRLEngine.StrandPerformance[] memory strandData = new IRRLEngine.StrandPerformance[](3);
        strandData[0] = IRRLEngine.StrandPerformance({
            strandId: 0,
            currentValue: IStrandManager(strandManagerCapital).getTotalValue(),
            targetValue: VaultMath.calculatePercentage(vaultState.totalValue, currentAllocation.capitalStrand),
            actualAPY: 500, // 5% - placeholder
            targetAPY: 500,
            performanceRatio: 10000 // 100% - placeholder
        });
        strandData[1] = IRRLEngine.StrandPerformance({
            strandId: 1,
            currentValue: IStrandManager(strandManagerYield).getTotalValue(),
            targetValue: VaultMath.calculatePercentage(vaultState.totalValue, currentAllocation.yieldStrand),
            actualAPY: 1000, // 10% - placeholder
            targetAPY: 1000,
            performanceRatio: 10000 // 100% - placeholder
        });
        strandData[2] = IRRLEngine.StrandPerformance({
            strandId: 2,
            currentValue: IStrandManager(strandManagerMomentum).getTotalValue(),
            targetValue: VaultMath.calculatePercentage(vaultState.totalValue, currentAllocation.momentumStrand),
            actualAPY: 1500, // 15% - placeholder
            targetAPY: 1500,
            performanceRatio: 10000 // 100% - placeholder
        });
        
        uint256[] memory newAllocations = IRRLEngine(rrlEngine).calculateOptimalAllocation(strandData);
        
        // Execute rebalancing across strands
        if (newAllocations.length >= 3) {
            currentAllocation.capitalStrand = newAllocations[0];
            currentAllocation.yieldStrand = newAllocations[1];
            currentAllocation.momentumStrand = newAllocations[2];
            
            emit StrandRebalanced(0, newAllocations[0]);
            emit StrandRebalanced(1, newAllocations[1]);
            emit StrandRebalanced(2, newAllocations[2]);
        }
    }
    
    /**
     * @dev Process emergency withdrawal for SubClub member
     */
    function processEmergencyWithdrawal(address subClub, address member, uint256 amount) external override onlyRegisteredSubClub nonReentrant {
        require(amount > 0, "Invalid withdrawal amount");
        require(amount <= vaultState.totalValue, "Insufficient vault balance");
        
        // Calculate proportional withdrawal from strands
        _withdrawFromStrands(amount);
        
        vaultState.totalValue -= amount;
        vaultState.totalDeposits -= amount;
        
        // Transfer funds back to SubClub for member withdrawal
        // Note: In production, this would transfer actual tokens
        // For now, we just emit the event
        emit WithdrawalMade(member, amount);
    }
    
    /**
     * @dev Request Phase 2 transition from SubClub
     */
    function requestPhase2Transition(address subClub) external override onlyRegisteredSubClub {
        require(vaultState.currentPhase == Phase.PHASE_1, "Already in Phase 2");
        
        if (shouldTransitionPhase2()) {
            transitionToPhase2();
        }
    }
    
    /**
     * @dev Register a new SubClub
     */
    function registerSubClub(address subClub) external override onlyOwner {
        require(subClub != address(0), "Invalid SubClub address");
        require(!registeredSubClubs[subClub], "SubClub already registered");
        
        registeredSubClubs[subClub] = true;
        subClubList.push(subClub);
    }
    
    /**
     * @dev Remove a SubClub registration
     */
    function removeSubClub(address subClub) external override onlyOwner {
        require(registeredSubClubs[subClub], "SubClub not registered");
        
        registeredSubClubs[subClub] = false;
        
        // Remove from array
        for (uint256 i = 0; i < subClubList.length; i++) {
            if (subClubList[i] == subClub) {
                subClubList[i] = subClubList[subClubList.length - 1];
                subClubList.pop();
                break;
            }
        }
    }
    
    // View functions
    
    /**
     * @dev Get current vault state
     */
    function getVaultState() external view override returns (VaultState memory) {
        return vaultState;
    }
    
    /**
     * @dev Get current strand allocation
     */
    function getCurrentAllocation() external view override returns (StrandAllocation memory) {
        return currentAllocation;
    }
    
    /**
     * @dev Get value of specific strand
     */
    function getStrandValue(uint256 strandId) external view override returns (uint256) {
        if (strandId == 0) {
            return IStrandManager(strandManagerCapital).getTotalValue();
        } else if (strandId == 1) {
            return IStrandManager(strandManagerYield).getTotalValue();
        } else if (strandId == 2) {
            return IStrandManager(strandManagerMomentum).getTotalValue();
        } else if (strandId == 3) {
            return IBTCAccumulator(btcAccumulator).getTotalValue();
        }
        return 0;
    }
    
    /**
     * @dev Get total vault value
     */
    function getTotalValue() external view override returns (uint256) {
        return _calculateTotalValue();
    }
    
    /**
     * @dev Get current phase
     */
    function getPhase() external view override returns (Phase) {
        return vaultState.currentPhase;
    }
    
    /**
     * @dev Check if harvest can be executed
     */
    function canHarvest() public view override returns (bool) {
        // Allow first harvest immediately
        if (vaultState.harvestCount == 0) {
            return true;
        }
        return block.timestamp >= vaultState.lastHarvestTime + HARVEST_INTERVAL;
    }
    
    /**
     * @dev Check if Phase 2 transition should occur
     */
    function shouldTransitionPhase2() public view override returns (bool) {
        if (vaultState.currentPhase == Phase.PHASE_2) return false;
        
        // Condition 1: Value threshold reached
        bool valueCondition = vaultState.totalValue >= PHASE_2_VALUE_THRESHOLD;
        
        // Condition 2: Time-based trigger (simplified - would need SubClub completion tracking)
        // For now, just use value condition
        
        return valueCondition;
    }
    
    /**
     * @dev Get all registered SubClubs
     */
    function getRegisteredSubClubs() external view override returns (address[] memory) {
        return subClubList;
    }
    
    // Emergency functions
    
    /**
     * @dev Emergency pause
     */
    function emergencyPause() external override onlyEmergencyModule {
        _pause();
        vaultState.isPaused = true;
    }
    
    /**
     * @dev Emergency unpause
     */
    function emergencyUnpause() external override onlyEmergencyModule {
        _unpause();
        vaultState.isPaused = false;
    }
    
    /**
     * @dev Emergency withdraw tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external override onlyOwner whenPaused {
        require(token != address(0), "Invalid token address");
        IERC20(token).transfer(owner(), amount);
    }
    
    // Internal functions
    
    /**
     * @dev Distribute deposit amount to strands based on current allocation
     */
    function _distributeToStrands(uint256 amount) internal {
        if (vaultState.currentPhase == Phase.PHASE_1) {
            uint256 capitalAmount = VaultMath.calculatePercentage(amount, currentAllocation.capitalStrand);
            uint256 yieldAmount = VaultMath.calculatePercentage(amount, currentAllocation.yieldStrand);
            uint256 momentumAmount = VaultMath.calculatePercentage(amount, currentAllocation.momentumStrand);
            
            // Deposit to respective strand managers
            IStrandManager(strandManagerCapital).deposit(capitalAmount);
            IStrandManager(strandManagerYield).deposit(yieldAmount);
            IStrandManager(strandManagerMomentum).deposit(momentumAmount);
        } else {
            // Phase 2: All to BTC accumulator
            IBTCAccumulator(btcAccumulator).deposit(amount);
        }
    }
    
    /**
     * @dev Withdraw amount proportionally from strands
     */
    function _withdrawFromStrands(uint256 amount) internal {
        if (vaultState.currentPhase == Phase.PHASE_1) {
            uint256 capitalAmount = VaultMath.calculatePercentage(amount, currentAllocation.capitalStrand);
            uint256 yieldAmount = VaultMath.calculatePercentage(amount, currentAllocation.yieldStrand);
            uint256 momentumAmount = VaultMath.calculatePercentage(amount, currentAllocation.momentumStrand);
            
            // Withdraw from respective strand managers
            IStrandManager(strandManagerCapital).withdraw(capitalAmount);
            IStrandManager(strandManagerYield).withdraw(yieldAmount);
            IStrandManager(strandManagerMomentum).withdraw(momentumAmount);
        } else {
            // Phase 2: Withdraw from BTC accumulator
            IBTCAccumulator(btcAccumulator).withdraw(amount);
        }
    }
    
    /**
     * @dev Calculate total profits from all strands
     */
    function _calculateTotalProfits() internal view returns (uint256) {
        uint256 totalProfits = 0;
        
        if (vaultState.currentPhase == Phase.PHASE_1) {
            totalProfits += IStrandManager(strandManagerCapital).getProfits();
            totalProfits += IStrandManager(strandManagerYield).getProfits();
            totalProfits += IStrandManager(strandManagerMomentum).getProfits();
        } else {
            totalProfits += IBTCAccumulator(btcAccumulator).getProfits();
        }
        
        return totalProfits;
    }
    
    /**
     * @dev Calculate total vault value across all strands
     */
    function _calculateTotalValue() internal view returns (uint256) {
        uint256 totalValue = 0;
        
        if (vaultState.currentPhase == Phase.PHASE_1) {
            totalValue += IStrandManager(strandManagerCapital).getTotalValue();
            totalValue += IStrandManager(strandManagerYield).getTotalValue();
            totalValue += IStrandManager(strandManagerMomentum).getTotalValue();
        } else {
            totalValue += IBTCAccumulator(btcAccumulator).getTotalValue();
        }
        
        return totalValue;
    }
}
