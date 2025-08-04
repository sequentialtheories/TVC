const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Starting contract verification on Polygonscan...\n");
  
  const deploymentPath = path.join(__dirname, '../../deployments/amoy-deployment.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const addresses = deployment.addresses;
  
  console.log("Waiting 60 seconds for Polygonscan to index contracts...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  const verificationData = [
    { 
      name: "MockAavePool", 
      address: addresses.mockAavePool, 
      constructorArguments: [] 
    },
    { 
      name: "MockQuickSwapRouter", 
      address: addresses.mockQuickSwapRouter, 
      constructorArguments: [] 
    },
    { 
      name: "MockWBTC", 
      address: addresses.mockWBTC, 
      constructorArguments: [] 
    },
    { 
      name: "EmergencyModule", 
      address: addresses.emergencyModule, 
      constructorArguments: [] 
    },
    { 
      name: "MegaVaultFactory", 
      address: addresses.factory, 
      constructorArguments: [
        addresses.megaVault,
        addresses.emergencyModule
      ] 
    },
    { 
      name: "StrandManagerCapital", 
      address: addresses.strand1, 
      constructorArguments: [addresses.factory] 
    },
    { 
      name: "StrandManagerYield", 
      address: addresses.strand2, 
      constructorArguments: [addresses.factory] 
    },
    { 
      name: "StrandManagerMomentum", 
      address: addresses.strand3, 
      constructorArguments: [addresses.factory] 
    },
    { 
      name: "RRLEngine", 
      address: addresses.rrlEngine, 
      constructorArguments: [addresses.factory] 
    },
    { 
      name: "BTCAccumulator", 
      address: addresses.btcAccumulator, 
      constructorArguments: [
        addresses.factory,
        addresses.mockWBTC,
        process.env.USDC_ADDRESS
      ] 
    },
    { 
      name: "SubscriptionLender", 
      address: addresses.lender, 
      constructorArguments: [
        addresses.factory,
        addresses.mockAavePool,
        process.env.USDC_ADDRESS
      ] 
    },
    { 
      name: "MegaVault", 
      address: addresses.megaVault, 
      constructorArguments: [
        addresses.strand1,
        addresses.strand2,
        addresses.strand3,
        addresses.rrlEngine,
        addresses.btcAccumulator,
        addresses.emergencyModule
      ] 
    }
  ];
  
  const results = { verified: [], failed: [] };
  
  for (const contract of verificationData) {
    try {
      console.log(`\n🔍 Verifying ${contract.name} at ${contract.address}...`);
      
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArguments,
        network: "amoy"
      });
      
      console.log(`✅ ${contract.name} verified successfully`);
      results.verified.push(contract.name);
      
    } catch (error) {
      console.log(`⚠️ ${contract.name} verification failed:`, error.message);
      results.failed.push({ name: contract.name, error: error.message });
    }
    
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("📊 VERIFICATION SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Verified: ${results.verified.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.verified.length > 0) {
    console.log("\n✅ Successfully verified contracts:");
    results.verified.forEach(name => console.log(`  - ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log("\n❌ Failed to verify contracts:");
    results.failed.forEach(item => console.log(`  - ${item.name}: ${item.error}`));
  }
  
  fs.writeFileSync(
    path.join(__dirname, '../../verification-results.json'),
    JSON.stringify(results, null, 2)
  );
  
  console.log("\n📄 Results saved to verification-results.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
