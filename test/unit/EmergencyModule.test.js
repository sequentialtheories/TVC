const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("EmergencyModule", function () {
    let emergencyModule;
    let owner, admin1, admin2, user;
    
    beforeEach(async function () {
        [owner, admin1, admin2, user] = await ethers.getSigners();
        
        const EmergencyModule = await ethers.getContractFactory("EmergencyModule");
        emergencyModule = await EmergencyModule.deploy();
        await emergencyModule.deployed();
    });
    
    it("Should deploy with correct initial state", async function () {
        expect(await emergencyModule.owner()).to.equal(owner.address);
        expect(await emergencyModule.isEmergencyAdmin(owner.address)).to.be.true;
        expect(await emergencyModule.paused()).to.be.false;
    });
    
    it("Should add and remove emergency admins", async function () {
        await emergencyModule.addEmergencyAdmin(admin1.address);
        expect(await emergencyModule.isEmergencyAdmin(admin1.address)).to.be.true;
        
        await emergencyModule.removeEmergencyAdmin(admin1.address);
        expect(await emergencyModule.isEmergencyAdmin(admin1.address)).to.be.false;
    });
    
    it("Should handle emergency requests correctly", async function () {
        await emergencyModule.addEmergencyAdmin(admin1.address);
        await emergencyModule.connect(admin1).requestEmergency();
        
        const request = await emergencyModule.getEmergencyRequest(admin1.address);
        expect(request).to.be.gt(0);
        
        await expect(
            emergencyModule.connect(admin1).executeEmergency()
        ).to.be.revertedWith("Emergency not ready");
        
        await ethers.provider.send("evm_increaseTime", [24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        
        await emergencyModule.connect(admin1).executeEmergency();
        expect(await emergencyModule.paused()).to.be.true;
    });
});
