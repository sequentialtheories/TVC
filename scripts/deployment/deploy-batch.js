const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const batchType = process.env.BATCH_TYPE || 'batch1';
  console.log(`🚀 Starting TVC Batch ${batchType} deployment to Amoy Testnet...\n`);
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const deploymentPath = path.join(__dirname, '../../deployments');
  const deploymentFile = path.join(deploymentPath, 'amoy-deployment.json');
  
  let deployments = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf8')).addresses || {};
  }

  try {
    if (batchType === 'batch1') {
      await deployBatch1(deployments);
    } else if (batchType === 'batch2') {
      await deployBatch2(deployments);
    } else if (batchType === 'batch3') {
      await deployBatch3(deployments);
    } else {
      throw new Error("Invalid batch type. Use batch1, batch2, or batch3");
    }

    const deploymentData = {
      network: "amoy",
      chainId: 80002,
      deployedAt: new Date().toISOString(),
      addresses: deployments,
      deployer: deployer.address,
      batchCompleted: batchType
    };

    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    console.log(`\n✅ Batch ${batchType} deployment complete!`);
    
  } catch (error) {
    console.error(`\n❌ Batch ${batchType} deployment failed:`, error);
    process.exit(1);
  }
}

async function deployBatch1(deployments) {
  console.log("\n=== BATCH 1: Core Infrastructure ===");
  
  console.log("\n1.1. Deploying Mock External Protocols...");
  
  const MockAavePool = await ethers.getContractFactory("MockAavePool");
  const mockAavePool = await MockAavePool.deploy();
  await mockAavePool.deployed();
  deployments.mockAavePool = mockAavePool.address;
  console.log("✅ MockAavePool deployed to:", mockAavePool.address);
  
  const MockQuickSwapRouter = await ethers.getContractFactory("MockQuickSwapRouter");
  const mockQuickSwapRouter = await MockQuickSwapRouter.deploy();
  await mockQuickSwapRouter.deployed();
  deployments.mockQuickSwapRouter = mockQuickSwapRouter.address;
  console.log("✅ MockQuickSwapRouter deployed to:", mockQuickSwapRouter.address);
  
  const MockWBTC = await ethers.getContractFactory("MockWBTC");
  const mockWBTC = await MockWBTC.deploy();
  await mockWBTC.deployed();
  deployments.mockWBTC = mockWBTC.address;
  console.log("✅ MockWBTC deployed to:", mockWBTC.address);

  console.log("\n1.2. Deploying EmergencyModule...");
  const EmergencyModule = await ethers.getContractFactory("EmergencyModule");
  const emergencyModule = await EmergencyModule.deploy();
  await emergencyModule.deployed();
  deployments.emergencyModule = emergencyModule.address;
  console.log("✅ EmergencyModule deployed to:", emergencyModule.address);

  console.log("\n1.3. Deploying MegaVaultFactory...");
  const MegaVaultFactory = await ethers.getContractFactory("MegaVaultFactory");
  const factory = await MegaVaultFactory.deploy(
    "0x0000000000000000000000000000000000000001",
    emergencyModule.address
  );
  await factory.deployed();
  deployments.factory = factory.address;
  console.log("✅ MegaVaultFactory deployed to:", factory.address);
}

async function deployBatch2(deployments) {
  console.log("\n=== BATCH 2: Strand Managers and Engines ===");
  
  if (!deployments.factory) {
    throw new Error("Factory address not found. Run batch1 first.");
  }

  console.log("\n2.1. Deploying Strand Managers...");
  
  if (!deployments.strand1) {
    const StrandManagerCapital = await ethers.getContractFactory("StrandManagerCapital");
    const strand1 = await StrandManagerCapital.deploy(deployments.factory);
    await strand1.deployed();
    deployments.strand1 = strand1.address;
    console.log("✅ StrandManagerCapital deployed to:", strand1.address);
  } else {
    console.log("⏭️ StrandManagerCapital already deployed at:", deployments.strand1);
  }

  if (!deployments.strand2) {
    const StrandManagerYield = await ethers.getContractFactory("StrandManagerYield");
    const strand2 = await StrandManagerYield.deploy(deployments.factory);
    await strand2.deployed();
    deployments.strand2 = strand2.address;
    console.log("✅ StrandManagerYield deployed to:", strand2.address);
  } else {
    console.log("⏭️ StrandManagerYield already deployed at:", deployments.strand2);
  }

  if (!deployments.strand3) {
    const StrandManagerMomentum = await ethers.getContractFactory("StrandManagerMomentum");
    const strand3 = await StrandManagerMomentum.deploy(deployments.factory);
    await strand3.deployed();
    deployments.strand3 = strand3.address;
    console.log("✅ StrandManagerMomentum deployed to:", strand3.address);
  } else {
    console.log("⏭️ StrandManagerMomentum already deployed at:", deployments.strand3);
  }

  console.log("\n2.2. Deploying RRLEngine...");
  if (!deployments.rrlEngine) {
    const RRLEngine = await ethers.getContractFactory("RRLEngine");
    const rrlEngine = await RRLEngine.deploy(deployments.factory);
    await rrlEngine.deployed();
    deployments.rrlEngine = rrlEngine.address;
    console.log("✅ RRLEngine deployed to:", rrlEngine.address);
  } else {
    console.log("⏭️ RRLEngine already deployed at:", deployments.rrlEngine);
  }

  console.log("\n2.3. Deploying BTCAccumulator...");
  if (!deployments.btcAccumulator) {
    const BTCAccumulator = await ethers.getContractFactory("BTCAccumulator");
    const btcAccumulator = await BTCAccumulator.deploy(
      deployments.factory,
      deployments.mockWBTC,
      process.env.USDC_ADDRESS
    );
    await btcAccumulator.deployed();
    deployments.btcAccumulator = btcAccumulator.address;
    console.log("✅ BTCAccumulator deployed to:", btcAccumulator.address);
  } else {
    console.log("⏭️ BTCAccumulator already deployed at:", deployments.btcAccumulator);
  }

  console.log("\n2.4. Deploying SubscriptionLender...");
  if (!deployments.lender) {
    const SubscriptionLender = await ethers.getContractFactory("SubscriptionLender");
    const lender = await SubscriptionLender.deploy(
      deployments.factory,
      deployments.mockAavePool,
      process.env.USDC_ADDRESS
    );
    await lender.deployed();
    deployments.lender = lender.address;
    console.log("✅ SubscriptionLender deployed to:", lender.address);
  } else {
    console.log("⏭️ SubscriptionLender already deployed at:", deployments.lender);
  }
}

async function deployBatch3(deployments) {
  console.log("\n=== BATCH 3: MegaVault and Configuration ===");
  
  const requiredContracts = ['strand1', 'strand2', 'strand3', 'rrlEngine', 'btcAccumulator', 'emergencyModule'];
  for (const contract of requiredContracts) {
    if (!deployments[contract]) {
      throw new Error(`${contract} address not found. Run previous batches first.`);
    }
  }

  console.log("\n3.1. Deploying MegaVault...");
  const MegaVault = await ethers.getContractFactory("MegaVault");
  const megaVault = await MegaVault.deploy(
    deployments.strand1,
    deployments.strand2,
    deployments.strand3,
    deployments.rrlEngine,
    deployments.btcAccumulator,
    deployments.emergencyModule
  );
  await megaVault.deployed();
  deployments.megaVault = megaVault.address;
  console.log("✅ MegaVault deployed to:", megaVault.address);

  console.log("\n3.2. Configuring contracts...");
  const factory = await ethers.getContractAt("MegaVaultFactory", deployments.factory);
  await factory.updateMegaVault(megaVault.address);
  console.log("✅ MegaVault address updated in factory");

  const emergencyModule = await ethers.getContractAt("EmergencyModule", deployments.emergencyModule);
  await emergencyModule.authorizeContract(deployments.factory);
  await emergencyModule.authorizeContract(megaVault.address);
  console.log("✅ Contracts authorized in EmergencyModule");

  console.log("\n3.3. Verifying contracts on Polygonscan...");
  await verifyContracts(deployments);
}

async function verifyContracts(deployments) {
  console.log("Waiting 60 seconds for Polygonscan to index...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  const verificationData = [
    { name: "mockAavePool", address: deployments.mockAavePool, constructorArguments: [] },
    { name: "mockQuickSwapRouter", address: deployments.mockQuickSwapRouter, constructorArguments: [] },
    { name: "mockWBTC", address: deployments.mockWBTC, constructorArguments: [] },
    { name: "emergencyModule", address: deployments.emergencyModule, constructorArguments: [] },
    { name: "factory", address: deployments.factory, constructorArguments: ["0x0000000000000000000000000000000000000001", deployments.emergencyModule] },
    { name: "strand1", address: deployments.strand1, constructorArguments: [deployments.factory] },
    { name: "strand2", address: deployments.strand2, constructorArguments: [deployments.factory] },
    { name: "strand3", address: deployments.strand3, constructorArguments: [deployments.factory] },
    { name: "rrlEngine", address: deployments.rrlEngine, constructorArguments: [deployments.factory] },
    { name: "btcAccumulator", address: deployments.btcAccumulator, constructorArguments: [deployments.factory, deployments.mockWBTC, process.env.USDC_ADDRESS] },
    { name: "lender", address: deployments.lender, constructorArguments: [deployments.factory, deployments.mockAavePool, process.env.USDC_ADDRESS] },
    { name: "megaVault", address: deployments.megaVault, constructorArguments: [deployments.strand1, deployments.strand2, deployments.strand3, deployments.rrlEngine, deployments.btcAccumulator, deployments.emergencyModule] }
  ];
  
  for (const contract of verificationData) {
    if (!contract.address) continue;
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
