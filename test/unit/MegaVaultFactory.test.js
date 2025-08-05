const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MegaVaultFactory", function () {
    let factory;
    let megaVault;
    let emergencyModule;
    let owner, user1, user2, user3, user4, user5, user6, user7, user8, user9;
    
    beforeEach(async function () {
        [owner, user1, user2, user3, user4, user5, user6, user7, user8, user9] = await ethers.getSigners();
        
        const MockMegaVault = await ethers.getContractFactory("EmergencyModule"); // Using EmergencyModule as mock
        megaVault = await MockMegaVault.deploy();
        await megaVault.deployed();
        
        const EmergencyModule = await ethers.getContractFactory("EmergencyModule");
        emergencyModule = await EmergencyModule.deploy();
        await emergencyModule.deployed();
        
        const MegaVaultFactory = await ethers.getContractFactory("MegaVaultFactory");
        factory = await MegaVaultFactory.deploy(megaVault.address, emergencyModule.address);
        await factory.deployed();
    });
    
    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await factory.owner()).to.equal(owner.address);
        });
        
        it("Should set correct initial parameters", async function () {
            expect(await factory.getMegaVault()).to.equal(megaVault.address);
            expect(await factory.getGlobalFee()).to.equal(100); // 1%
            expect(await factory.getSubClubCount()).to.equal(0);
        });
        
        it("Should fail with invalid parameters", async function () {
            const MegaVaultFactory = await ethers.getContractFactory("MegaVaultFactory");
            
            await expect(
                MegaVaultFactory.deploy(ethers.constants.AddressZero, emergencyModule.address)
            ).to.be.revertedWith("Invalid mega vault address");
            
            await expect(
                MegaVaultFactory.deploy(megaVault.address, ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid emergency module address");
        });
    });
    
    describe("Access Control", function () {
        it("Should allow owner to set global fee", async function () {
            await factory.setGlobalFee(200);
            expect(await factory.getGlobalFee()).to.equal(200);
        });
        
        it("Should prevent non-owner from setting global fee", async function () {
            await expect(
                factory.connect(user1).setGlobalFee(200)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
        
        it("Should prevent setting fee too high", async function () {
            await expect(
                factory.setGlobalFee(1001) // > 10%
            ).to.be.revertedWith("Fee too high");
        });
    });
    
    describe("SubClub Creation", function () {
        it("Should create SubClub with valid parameters", async function () {
            const members = [user1.address, user2.address, user3.address, user4.address];
            const lockPeriod = 365 * 24 * 60 * 60; // 1 year
            const rigor = 0; // LIGHT
            
            const tx = await factory.createSubClub(members, lockPeriod, rigor, false);
            const receipt = await tx.wait();
            
            const event = receipt.events.find(e => e.event === "SubClubCreated");
            expect(event).to.not.be.undefined;
            
            expect(await factory.getSubClubCount()).to.equal(1);
            
            const subClubAddress = await factory.getSubClub(user1.address);
            expect(subClubAddress).to.not.equal(ethers.constants.AddressZero);
            expect(await factory.isSubClub(subClubAddress)).to.be.true;
        });
        
        it("Should fail with invalid member count", async function () {
            await expect(
                factory.createSubClub([], 365 * 24 * 60 * 60, 0, false)
            ).to.be.revertedWith("Invalid member count");
            
            const tooManyMembers = [
                user1.address, user2.address, user3.address, user4.address,
                user5.address, user6.address, user7.address, user8.address, user9.address
            ];
            await expect(
                factory.createSubClub(tooManyMembers, 365 * 24 * 60 * 60, 0, false)
            ).to.be.revertedWith("Invalid member count");
        });
        
        it("Should fail with invalid lock period", async function () {
            const members = [user1.address, user2.address, user3.address, user4.address];
            
            await expect(
                factory.createSubClub(members, 30 * 24 * 60 * 60, 0, false) // 30 days
            ).to.be.revertedWith("Invalid traditional contract lock period");
            
            await expect(
                factory.createSubClub(members, 25 * 365 * 24 * 60 * 60, 0, false) // 25 years
            ).to.be.revertedWith("Invalid traditional contract lock period");
        });
        
        it("Should fail with duplicate members", async function () {
            const members = [user1.address, user2.address, user1.address, user4.address];
            
            await expect(
                factory.createSubClub(members, 365 * 24 * 60 * 60, 0, false)
            ).to.be.revertedWith("Duplicate member");
        });
        
        it("Should fail if member already in another subclub", async function () {
            const members1 = [user1.address, user2.address, user3.address, user4.address];
            const members2 = [user1.address, user5.address, user6.address, user7.address];
            
            await factory.createSubClub(members1, 365 * 24 * 60 * 60, 0, false);
            
            await expect(
                factory.createSubClub(members2, 365 * 24 * 60 * 60, 0, false)
            ).to.be.revertedWith("Member already in subclub");
        });
    });
    
    describe("Emergency Functions", function () {
        it("Should toggle emergency pause", async function () {
            expect(await factory.emergencyPaused()).to.be.false;
            
            await factory.toggleEmergencyPause();
            expect(await factory.emergencyPaused()).to.be.true;
            
            await factory.toggleEmergencyPause();
            expect(await factory.emergencyPaused()).to.be.false;
        });
        
        it("Should prevent SubClub creation when emergency paused", async function () {
            await factory.toggleEmergencyPause();
            
            const members = [user1.address, user2.address, user3.address, user4.address];
            await expect(
                factory.createSubClub(members, 365 * 24 * 60 * 60, 0, false)
            ).to.be.revertedWith("Emergency paused");
        });
    });
});
