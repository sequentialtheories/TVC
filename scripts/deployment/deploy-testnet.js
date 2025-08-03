const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Vault Club deployment to Amoy Testnet...\n");
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const deployments = {};

  try {
    console.log("\n1. Deploying EmergencyModule...");
    const EmergencyModule = await ethers.getContractFactory("EmergencyModule");
    const emergencyModule = await EmergencyModule.deploy();
    await emergencyModule.deployed();
    deployments.emergencyModule = emergencyModule.address;
    console.log("✅ EmergencyModule deployed to:", emergencyModule.address);

    console.log("\n2. Deploying MegaVaultFactory...");
    const MegaVaultFactory = await ethers.getContractFactory("MegaVaultFactory");
    const factory = await MegaVaultFactory.deploy(
      "0x0000000000000000000000000000000000000000",
      emergencyModule.address
    );
    await factory.deployed();
    deployments.factory = factory.address;
    console.log("✅ MegaVaultFactory deployed to:", factory.address);

    console.log("\n3. Deploying Strand Managers...");
    const StrandManagerCapital = await ethers.getContractFactory("StrandManagerCapital");
    const strand1 = await StrandManagerCapital.deploy(factory.address);
    await strand1.deployed();
    deployments.strand1 = strand1.address;
    console.log("✅ StrandManagerCapital deployed to:", strand1.address);

    const StrandManagerYield = await ethers.getContractFactory("StrandManagerYield");
    const strand2 = await StrandManagerYield.deploy(factory.address);
    await strand2.deployed();
    deployments.strand2 = strand2.address;
    console.log("✅ StrandManagerYield deployed to:", strand2.address);

    const StrandManagerMomentum = await ethers.getContractFactory("StrandManagerMomentum");
    const strand3 = await StrandManagerMomentum.deploy(factory.address);
    await strand3.deployed();
    deployments.strand3 = strand3.address;
    console.log("✅ StrandManagerMomentum deployed to:", strand3.address);

    console.log("\n4. Deploying RRLEngine...");
    const RRLEngine = await ethers.getContractFactory("RRLEngine");
    const rrlEngine = await RRLEngine.deploy(
      factory.address,
      [strand1.address, strand2.address, strand3.address]
    );
    await rrlEngine.deployed();
    deployments.rrlEngine = rrlEngine.address;
    console.log("✅ RRLEngine deployed to:", rrlEngine.address);

    console.log("\n5. Deploying BTCAccumulator...");
    const BTCAccumulator = await ethers.getContractFactory("BTCAccumulator");
    const btcAccumulator = await BTCAccumulator.deploy(
      factory.address,
      process.env.WBTC_ADDRESS,
      process.env.QUICKSWAP_ROUTER
    );
    await btcAccumulator.deployed();
    deployments.btcAccumulator = btcAccumulator.address;
    console.log("✅ BTCAccumulator deployed to:", btcAccumulator.address);

    console.log("\n6. Deploying SubscriptionLender...");
    const SubscriptionLender = await ethers.getContractFactory("SubscriptionLender");
    const lender = await SubscriptionLender.deploy(
      factory.address,
      process.env.AAVE_POOL_ADDRESS,
      process.env.USDC_ADDRESS
    );
    await lender.deployed();
    deployments.lender = lender.address;
    console.log("✅ SubscriptionLender deployed to:", lender.address);

    console.log("\n7. Deploying MegaVault...");
    const MegaVault = await ethers.getContractFactory("MegaVault");
    const megaVault = await MegaVault.deploy(
      factory.address,
      rrlEngine.address,
      btcAccumulator.address,
      [strand1.address, strand2.address, strand3.address]
    );
    await megaVault.deployed();
    deployments.megaVault = megaVault.address;
    console.log("✅ MegaVault deployed to:", megaVault.address);

    console.log("\n8. Configuring contracts...");
    await factory.updateMegaVault(megaVault.address);
    console.log("✅ MegaVault set in factory");

    await emergencyModule.authorizeContract(factory.address);
    await emergencyModule.authorizeContract(megaVault.address);
    console.log("✅ Contracts authorized in EmergencyModule");

    const deploymentData = {
      network: "amoy",
      chainId: 80002,
      deployedAt: new Date().toISOString(),
      addresses: deployments,
      deployer: deployer.address
    };

    const deploymentPath = path.join(__dirname, '../../deployments');
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }
    fs.writeFileSync(
      path.join(deploymentPath, 'amoy-deployment.json'),
      JSON.stringify(deploymentData, null, 2)
    );

    console.log("\n✅ Deployment complete! Addresses saved to deployments/amoy-deployment.json");
    
    console.log("\n9. Verifying contracts on Polygonscan...");
    await verifyContracts(deployments);

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

async function verifyContracts(deployments) {
  console.log("Waiting 60 seconds for Polygonscan to index...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  const verificationData = [
    { name: "emergencyModule", address: deployments.emergencyModule, constructorArguments: [] },
    { name: "factory", address: deployments.factory, constructorArguments: ["0x0000000000000000000000000000000000000000", deployments.emergencyModule] },
    { name: "strand1", address: deployments.strand1, constructorArguments: [deployments.factory] },
    { name: "strand2", address: deployments.strand2, constructorArguments: [deployments.factory] },
    { name: "strand3", address: deployments.strand3, constructorArguments: [deployments.factory] },
    { name: "rrlEngine", address: deployments.rrlEngine, constructorArguments: [deployments.factory, [deployments.strand1, deployments.strand2, deployments.strand3]] },
    { name: "btcAccumulator", address: deployments.btcAccumulator, constructorArguments: [deployments.factory, process.env.WBTC_ADDRESS, process.env.QUICKSWAP_ROUTER] },
    { name: "lender", address: deployments.lender, constructorArguments: [deployments.factory, process.env.AAVE_POOL_ADDRESS, process.env.USDC_ADDRESS] },
    { name: "megaVault", address: deployments.megaVault, constructorArguments: [deployments.factory, deployments.rrlEngine, deployments.btcAccumulator, [deployments.strand1, deployments.strand2, deployments.strand3]] }
  ];
  
  for (const contract of verificationData) {
    try {
      console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
        network: "amoy"
      });
      console.log(`✅ ${contract.name} verified`);
    } catch (error) {
      console.log(`⚠️ ${contract.name} verification failed:`, error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
