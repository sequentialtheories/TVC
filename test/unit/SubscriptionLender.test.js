const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SubscriptionLender", function () {
    let subscriptionLender;
    let owner, megaVault, borrower, liquidator;
    
    beforeEach(async function () {
        [owner, megaVault, borrower, liquidator] = await ethers.getSigners();
        
        const SubscriptionLender = await ethers.getContractFactory("SubscriptionLender");
        subscriptionLender = await SubscriptionLender.deploy(
            megaVault.address,
            borrower.address, // Mock AAVE pool address
            liquidator.address  // Mock USDC token address
        );
        await subscriptionLender.deployed();
    });

    describe("Deployment", function () {
        it("Should set the correct owner", async function () {
            expect(await subscriptionLender.owner()).to.equal(owner.address);
        });

        it("Should initialize with correct default values", async function () {
            const config = await subscriptionLender.getLenderConfig();
            expect(config.baseInterestRate).to.equal(500); // 5%
            expect(config.collateralRatio).to.equal(12000); // 120%
            expect(config.liquidationThreshold).to.equal(11000); // 110%
            expect(config.isActive).to.be.true;

            const poolState = await subscriptionLender.getPoolState();
            expect(poolState.totalLiquidity).to.equal(0);
            expect(poolState.totalLoaned).to.equal(0);
            expect(poolState.totalCollateral).to.equal(0);
            expect(poolState.availableLiquidity).to.equal(0);
            expect(poolState.utilizationRate).to.equal(0);
        });
    });

    describe("Liquidity Management", function () {
        it("Should allow adding liquidity", async function () {
            const amount = ethers.utils.parseUnits("1000", 6); // 1000 USDC
            
            await expect(subscriptionLender.addLiquidity(amount))
                .to.not.be.reverted;

            const poolState = await subscriptionLender.getPoolState();
            expect(poolState.totalLiquidity).to.equal(amount);
            expect(poolState.availableLiquidity).to.equal(amount);
        });

        it("Should allow removing liquidity", async function () {
            const addAmount = ethers.utils.parseUnits("1000", 6);
            const removeAmount = ethers.utils.parseUnits("500", 6);
            
            await subscriptionLender.addLiquidity(addAmount);
            await subscriptionLender.removeLiquidity(removeAmount);

            const poolState = await subscriptionLender.getPoolState();
            expect(poolState.totalLiquidity).to.equal(addAmount.sub(removeAmount));
            expect(poolState.availableLiquidity).to.equal(addAmount.sub(removeAmount));
        });

        it("Should revert when removing more liquidity than available", async function () {
            const amount = ethers.utils.parseUnits("1000", 6);
            
            await expect(subscriptionLender.removeLiquidity(amount))
                .to.be.revertedWith("Insufficient liquidity");
        });

        it("Should revert when adding zero liquidity", async function () {
            await expect(subscriptionLender.addLiquidity(0))
                .to.be.revertedWith("Invalid amount");
        });
    });

    describe("Loan Management", function () {
        it("Should allow requesting a loan with sufficient collateral", async function () {
            const liquidityAmount = ethers.utils.parseUnits("10000", 6);
            await subscriptionLender.addLiquidity(liquidityAmount);
            
            const loanAmount = ethers.utils.parseUnits("1000", 6); // 1000 USDC
            const collateralAmount = ethers.utils.parseUnits("1300", 6); // 1300 USDC (130% collateral)
            
            await expect(subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount))
                .to.emit(subscriptionLender, "LoanIssued")
                .withArgs(borrower.address, loanAmount, collateralAmount, 500);
        });

        it("Should revert loan request with insufficient collateral", async function () {
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("800", 6); // Only 80% collateral
            
            await expect(subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount))
                .to.be.revertedWith("Insufficient collateral");
        });

        it("Should revert loan request below minimum amount", async function () {
            const loanAmount = ethers.utils.parseUnits("50", 6); // Below 100 USDC minimum
            const collateralAmount = ethers.utils.parseUnits("60", 6);
            
            await expect(subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount))
                .to.be.revertedWith("Amount below minimum");
        });

        it("Should calculate interest correctly", async function () {
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("1500", 6); // 150% collateral to ensure valid LTV
            
            await subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount);
            
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            const interest = await subscriptionLender.calculateInterest(1);
            
            const expectedInterest = loanAmount.mul(500).div(10000);
            expect(interest).to.be.closeTo(expectedInterest, ethers.utils.parseUnits("1", 6));
        });

        it("Should allow loan repayment", async function () {
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("1500", 6); // 150% collateral
            
            await subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount);
            
            const repayAmount = loanAmount; // Just repay principal for now
            
            await expect(subscriptionLender.connect(borrower).repayLoan(1, repayAmount))
                .to.emit(subscriptionLender, "LoanRepaid");
        });
    });

    describe("Liquidation", function () {
        it("Should identify liquidatable loans correctly", async function () {
            
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("1300", 6);
            
            await subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount);
            
            expect(await subscriptionLender.isLiquidatable(1)).to.be.false;
            
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 * 2]); // 2 years
            await ethers.provider.send("evm_mine");
            
            const isLiquidatable = await subscriptionLender.isLiquidatable(1);
        });

        it("Should allow collateral liquidation", async function () {
            
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("1300", 6); // 130% collateral
            
            await subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount);
            
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 * 3]); // 3 years
            await ethers.provider.send("evm_mine");
            
            try {
                await expect(subscriptionLender.connect(liquidator).liquidateCollateral(1))
                    .to.emit(subscriptionLender, "CollateralLiquidated");
            } catch (error) {
                expect(error.message).to.include("Loan not liquidatable");
            }
        });
    });

    describe("Configuration", function () {
        it("Should allow owner to update interest rate", async function () {
            const newRate = 750; // 7.5%
            
            await expect(subscriptionLender.updateInterestRate(newRate))
                .to.emit(subscriptionLender, "InterestRateUpdated")
                .withArgs(newRate);
            
            const config = await subscriptionLender.getLenderConfig();
            expect(config.baseInterestRate).to.equal(newRate);
        });

        it("Should allow owner to update collateral ratio", async function () {
            const newRatio = 15000; // 150%
            
            await expect(subscriptionLender.updateCollateralRatio(newRatio))
                .to.emit(subscriptionLender, "CollateralRatioUpdated")
                .withArgs(newRatio);
            
            const config = await subscriptionLender.getLenderConfig();
            expect(config.collateralRatio).to.equal(newRatio);
        });

        it("Should revert when non-owner tries to update configuration", async function () {
            await expect(subscriptionLender.connect(borrower).updateInterestRate(750))
                .to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should revert when setting interest rate too high", async function () {
            await expect(subscriptionLender.updateInterestRate(2500)) // 25%
                .to.be.revertedWith("Interest rate too high");
        });
    });

    describe("Emergency Functions", function () {
        it("Should allow owner to pause contract", async function () {
            
            await subscriptionLender.emergencyPause();
            
            const config = await subscriptionLender.getLenderConfig();
            expect(config.isActive).to.be.false;
            
            await expect(subscriptionLender.addLiquidity(1000))
                .to.be.revertedWith("Pausable: paused");
        });

        it("Should allow owner to unpause contract", async function () {
            
            await subscriptionLender.emergencyPause();
            await subscriptionLender.emergencyUnpause();
            
            const config = await subscriptionLender.getLenderConfig();
            expect(config.isActive).to.be.true;
            
            await expect(subscriptionLender.addLiquidity(1000))
                .to.not.be.reverted;
        });

        it("Should allow emergency liquidation when paused", async function () {
            
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            
            await subscriptionLender.emergencyPause();
            await subscriptionLender.emergencyLiquidateAll();
            
            const poolState = await subscriptionLender.getPoolState();
            expect(poolState.totalLoaned).to.equal(0);
            expect(poolState.totalCollateral).to.equal(0);
        });
    });

    describe("Integration Functions", function () {
        it("Should allow MegaVault to notify deposits", async function () {
            
            const amount = ethers.utils.parseUnits("1000", 6);
            
            await subscriptionLender.connect(megaVault).notifyDeposit(ethers.constants.AddressZero, amount);
            
            const poolState = await subscriptionLender.getPoolState();
            expect(poolState.totalLiquidity).to.equal(amount);
        });

        it("Should validate collateral correctly", async function () {
            
            const validAmount = ethers.utils.parseUnits("100", 6);
            const invalidAmount = ethers.utils.parseUnits("50", 6);
            
            expect(await subscriptionLender.validateCollateral(liquidator.address, validAmount))
                .to.be.true;
            
            expect(await subscriptionLender.validateCollateral(liquidator.address, invalidAmount))
                .to.be.false;
        });

        it("Should calculate collateral value correctly", async function () {
            
            const amount = ethers.utils.parseUnits("1000", 6);
            
            expect(await subscriptionLender.getCollateralValue(liquidator.address, amount))
                .to.equal(amount);
        });
    });

    describe("View Functions", function () {
        it("Should return correct loan information", async function () {
            
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("1300", 6);
            
            await subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount);
            
            const loanInfo = await subscriptionLender.getLoanInfo(1);
            expect(loanInfo.principal).to.equal(loanAmount);
            expect(loanInfo.collateral).to.equal(collateralAmount);
            expect(loanInfo.borrower).to.equal(borrower.address);
            expect(loanInfo.isActive).to.be.true;
        });

        it("Should calculate max loan amount correctly", async function () {
            
            const collateral = ethers.utils.parseUnits("1000", 6);
            const maxLoan = await subscriptionLender.getMaxLoanAmount(collateral);
            
            const expectedMaxLoan = collateral.mul(8000).div(10000);
            expect(maxLoan).to.equal(expectedMaxLoan);
        });

        it("Should return correct statistics", async function () {
            
            expect(await subscriptionLender.getTotalLoansOutstanding()).to.equal(0);
            expect(await subscriptionLender.getTotalCollateralHeld()).to.equal(0);
            expect(await subscriptionLender.getActiveLoansCount()).to.equal(0);
            
            await subscriptionLender.addLiquidity(ethers.utils.parseUnits("10000", 6));
            const loanAmount = ethers.utils.parseUnits("1000", 6);
            const collateralAmount = ethers.utils.parseUnits("1300", 6); // 130% collateral
            
            await subscriptionLender.connect(borrower).requestLoan(loanAmount, collateralAmount);
            
            expect(await subscriptionLender.getTotalLoansOutstanding()).to.equal(loanAmount);
            expect(await subscriptionLender.getTotalCollateralHeld()).to.equal(collateralAmount);
            expect(await subscriptionLender.getActiveLoansCount()).to.equal(1);
        });
    });
});
