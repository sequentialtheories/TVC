const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("MegaVault", function () {
    let megaVault;
    let emergencyModule;
    let mockStrandCapital, mockStrandYield, mockStrandMomentum;
    let mockRRLEngine, mockBTCAccumulator;
    let owner, subClub1, subClub2, user1;
    
    beforeEach(async function () {
        [owner, subClub1, subClub2, user1] = await ethers.getSigners();
        
        const EmergencyModule = await ethers.getContractFactory("EmergencyModule");
        emergencyModule = await EmergencyModule.deploy();
        await emergencyModule.deployed();
        
        const MockStrandManager = await ethers.getContractFactory("MockStrandManager");
        mockStrandCapital = await MockStrandManager.deploy();
        mockStrandYield = await MockStrandManager.deploy();
        mockStrandMomentum = await MockStrandManager.deploy();
        
        const MockRRLEngine = await ethers.getContractFactory("MockRRLEngine");
        mockRRLEngine = await MockRRLEngine.deploy();
        
        const MockBTCAccumulator = await ethers.getContractFactory("MockBTCAccumulator");
        mockBTCAccumulator = await MockBTCAccumulator.deploy();
        
        await mockStrandCapital.deployed();
        await mockStrandYield.deployed();
        await mockStrandMomentum.deployed();
        await mockRRLEngine.deployed();
        await mockBTCAccumulator.deployed();
        
        const MegaVault = await ethers.getContractFactory("MegaVault");
        megaVault = await MegaVault.deploy(
            mockStrandCapital.address,
            mockStrandYield.address,
            mockStrandMomentum.address,
            mockRRLEngine.address,
            mockBTCAccumulator.address,
            emergencyModule.address
        );
        await megaVault.deployed();
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await megaVault.owner()).to.equal(owner.address);
        });
        
        it("Should initialize with correct Phase 1 state", async function () {
            const vaultState = await megaVault.getVaultState();
            expect(vaultState.currentPhase).to.equal(0); // Phase.PHASE_1
            expect(vaultState.totalDeposits).to.equal(0);
            expect(vaultState.harvestCount).to.equal(0);
            expect(vaultState.isPaused).to.be.false;
        });
        
        it("Should initialize with correct Phase 1 allocation", async function () {
            const allocation = await megaVault.getCurrentAllocation();
            expect(allocation.capitalStrand).to.equal(1000);   // 10%
            expect(allocation.yieldStrand).to.equal(6000);     // 60%
            expect(allocation.momentumStrand).to.equal(3000);  // 30%
            expect(allocation.bitcoinStrand).to.equal(0);      // 0%
        });
        
        it("Should fail with invalid constructor parameters", async function () {
            const MegaVault = await ethers.getContractFactory("MegaVault");
            
            await expect(
                MegaVault.deploy(
                    ethers.constants.AddressZero,
                    mockStrandYield.address,
                    mockStrandMomentum.address,
                    mockRRLEngine.address,
                    mockBTCAccumulator.address,
                    emergencyModule.address
                )
            ).to.be.revertedWith("Invalid capital strand manager");
        });
    });
    
    describe("SubClub Registration", function () {
        it("Should register SubClub correctly", async function () {
            await megaVault.registerSubClub(subClub1.address);
            
            expect(await megaVault.registeredSubClubs(subClub1.address)).to.be.true;
            
            const registeredSubClubs = await megaVault.getRegisteredSubClubs();
            expect(registeredSubClubs).to.include(subClub1.address);
        });
        
        it("Should prevent duplicate registration", async function () {
            await megaVault.registerSubClub(subClub1.address);
            
            await expect(
                megaVault.registerSubClub(subClub1.address)
            ).to.be.revertedWith("SubClub already registered");
        });
        
        it("Should remove SubClub correctly", async function () {
            await megaVault.registerSubClub(subClub1.address);
            await megaVault.registerSubClub(subClub2.address);
            
            await megaVault.removeSubClub(subClub1.address);
            
            expect(await megaVault.registeredSubClubs(subClub1.address)).to.be.false;
            expect(await megaVault.registeredSubClubs(subClub2.address)).to.be.true;
            
            const registeredSubClubs = await megaVault.getRegisteredSubClubs();
            expect(registeredSubClubs).to.not.include(subClub1.address);
            expect(registeredSubClubs).to.include(subClub2.address);
        });
        
        it("Should prevent non-owner from registering SubClubs", async function () {
            await expect(
                megaVault.connect(user1).registerSubClub(subClub1.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
    
    describe("Deposit Handling", function () {
        beforeEach(async function () {
            await megaVault.registerSubClub(subClub1.address);
        });
        
        it("Should accept deposits from registered SubClubs", async function () {
            const depositAmount = ethers.utils.parseEther("1000");
            
            const tx = await megaVault.connect(subClub1).receiveDeposit(subClub1.address, depositAmount);
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === "DepositReceived");
            expect(event).to.not.be.undefined;
            expect(event.args.subClub).to.equal(subClub1.address);
            expect(event.args.amount).to.equal(depositAmount);
            
            const vaultState = await megaVault.getVaultState();
            expect(vaultState.totalDeposits).to.equal(depositAmount);
        });
        
        it("Should reject deposits from unregistered SubClubs", async function () {
            const depositAmount = ethers.utils.parseEther("1000");
            
            await expect(
                megaVault.connect(subClub2).receiveDeposit(subClub2.address, depositAmount)
            ).to.be.revertedWith("Not registered SubClub");
        });
        
        it("Should reject zero deposits", async function () {
            await expect(
                megaVault.connect(subClub1).receiveDeposit(subClub1.address, 0)
            ).to.be.revertedWith("Invalid deposit amount");
        });
    });
    
    describe("Harvest Functionality", function () {
        beforeEach(async function () {
            await megaVault.registerSubClub(subClub1.address);
        });
        
        it("Should check harvest readiness correctly", async function () {
            expect(await megaVault.canHarvest()).to.be.true;
        });
        
        it("Should prevent harvest when not ready", async function () {
            await megaVault.executeHarvest();
            
            expect(await megaVault.canHarvest()).to.be.false;
            
            await expect(megaVault.executeHarvest()).to.be.revertedWith("Harvest not ready");
        });
        
        it("Should execute harvest and update state", async function () {
            const tx = await megaVault.executeHarvest();
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === "HarvestExecuted");
            expect(event).to.not.be.undefined;
            
            const vaultState = await megaVault.getVaultState();
            expect(vaultState.harvestCount).to.equal(1);
        });
    });
    
    describe("Phase Transition", function () {
        beforeEach(async function () {
            await megaVault.registerSubClub(subClub1.address);
        });
        
        it("Should check Phase 2 transition conditions", async function () {
            expect(await megaVault.shouldTransitionPhase2()).to.be.false;
        });
        
        it("Should transition to Phase 2 when conditions are met", async function () {
            const depositAmount = ethers.utils.parseEther("3000000"); // 3M ETH to trigger high value
            await megaVault.connect(subClub1).receiveDeposit(subClub1.address, depositAmount);
            
            await megaVault.transitionToPhase2();
            
            const vaultState = await megaVault.getVaultState();
            expect(vaultState.currentPhase).to.equal(1); // Phase.PHASE_2
            
            const allocation = await megaVault.getCurrentAllocation();
            expect(allocation.bitcoinStrand).to.equal(10000); // 100%
            expect(allocation.capitalStrand).to.equal(0);
            expect(allocation.yieldStrand).to.equal(0);
            expect(allocation.momentumStrand).to.equal(0);
        });
        
        it("Should prevent duplicate Phase 2 transition", async function () {
            const depositAmount = ethers.utils.parseEther("3000000"); // 3M ETH to trigger high value
            await megaVault.connect(subClub1).receiveDeposit(subClub1.address, depositAmount);
            
            await megaVault.transitionToPhase2();
            
            await expect(megaVault.transitionToPhase2()).to.be.revertedWith("Already in Phase 2");
        });
    });
    
    describe("Emergency Functions", function () {
        it("Should allow emergency module to pause", async function () {
            await network.provider.request({
                method: "hardhat_impersonateAccount",
                params: [emergencyModule.address],
            });
            
            await network.provider.send("hardhat_setBalance", [
                emergencyModule.address,
                "0x1000000000000000000", // 1 ETH in hex
            ]);
            
            const emergencyModuleSigner = await ethers.getSigner(emergencyModule.address);
            
            await megaVault.connect(emergencyModuleSigner).emergencyPause();
            
            const vaultState = await megaVault.getVaultState();
            expect(vaultState.isPaused).to.be.true;
            
            await network.provider.request({
                method: "hardhat_stopImpersonatingAccount",
                params: [emergencyModule.address],
            });
        });
        
        it("Should prevent non-emergency module from pausing", async function () {
            await expect(
                megaVault.connect(user1).emergencyPause()
            ).to.be.revertedWith("Not emergency module");
        });
    });
});
