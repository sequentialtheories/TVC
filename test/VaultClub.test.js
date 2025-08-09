const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('VaultClub', function () {
  let vaultClub;
  let owner;
  let member1;
  let member2;

  beforeEach(async function () {
    [owner, member1, member2] = await ethers.getSigners();
    
    const VaultClub = await ethers.getContractFactory('VaultClub');
    vaultClub = await VaultClub.deploy();
    await vaultClub.deployed();
  });

  describe('Deployment', function () {
    it('Should set the right owner', async function () {
      expect(await vaultClub.hasRole(await vaultClub.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });

    it('Should initialize with correct values', async function () {
      expect(await vaultClub.totalDeposits()).to.equal(0);
      expect(await vaultClub.totalMembers()).to.equal(0);
      expect(await vaultClub.currentPhase()).to.equal(1);
    });
  });

  describe('Deposits', function () {
    it('Should allow deposits', async function () {
      const depositAmount = ethers.utils.parseEther('1');
      
      await expect(vaultClub.connect(member1).deposit(0, { value: depositAmount }))
        .to.emit(vaultClub, 'Deposit')
        .withArgs(member1.address, depositAmount);
      
      expect(await vaultClub.balanceOf(member1.address)).to.equal(depositAmount);
      expect(await vaultClub.totalDeposits()).to.equal(depositAmount);
      expect(await vaultClub.totalMembers()).to.equal(1);
    });

    it('Should track multiple members', async function () {
      const depositAmount1 = ethers.utils.parseEther('1');
      const depositAmount2 = ethers.utils.parseEther('2');
      
      await vaultClub.connect(member1).deposit(0, { value: depositAmount1 });
      await vaultClub.connect(member2).deposit(0, { value: depositAmount2 });
      
      expect(await vaultClub.totalMembers()).to.equal(2);
      expect(await vaultClub.totalDeposits()).to.equal(depositAmount1.add(depositAmount2));
    });
  });

  describe('Harvest and Route', function () {
    it('Should allow harvest after interval', async function () {
      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      await expect(vaultClub.harvestAndRoute())
        .to.emit(vaultClub, 'Harvest');
    });

    it('Should not allow harvest before interval', async function () {
      await expect(vaultClub.harvestAndRoute())
        .to.be.revertedWith('Too early to harvest');
    });
  });

  describe('Phase Transitions', function () {
    it('Should transition to phase 2 when threshold is met', async function () {
      const largeDeposit = ethers.utils.parseEther('100');
      await vaultClub.connect(member1).deposit(0, { value: largeDeposit });
      
      await ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
      await ethers.provider.send('evm_mine');
      
      await expect(vaultClub.harvestAndRoute())
        .to.emit(vaultClub, 'PhaseTransition')
        .withArgs(1, 2);
      
      expect(await vaultClub.currentPhase()).to.equal(2);
    });
  });

  describe('Withdrawals', function () {
    beforeEach(async function () {
      const depositAmount = ethers.utils.parseEther('1');
      await vaultClub.connect(member1).deposit(0, { value: depositAmount });
    });

    it('Should allow withdrawals', async function () {
      const withdrawAmount = ethers.utils.parseEther('0.5');
      
      await vaultClub.connect(member1).withdraw(withdrawAmount);
      
      expect(await vaultClub.balanceOf(member1.address)).to.equal(
        ethers.utils.parseEther('0.5')
      );
    });

    it('Should allow emergency withdrawals', async function () {
      const initialBalance = await vaultClub.balanceOf(member1.address);
      
      await expect(vaultClub.connect(member1).emergencyWithdraw())
        .to.emit(vaultClub, 'EmergencyWithdraw')
        .withArgs(member1.address, initialBalance);
      
      expect(await vaultClub.balanceOf(member1.address)).to.equal(0);
    });
  });
});
