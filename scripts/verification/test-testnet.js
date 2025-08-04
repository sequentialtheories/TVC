const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🧪 Starting comprehensive testnet testing...\n");
  
  const deploymentPath = path.join(__dirname, '../../deployments/amoy-deployment.json');
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const [tester] = await ethers.getSigners();
  
  console.log("Testing with account:", tester.address);
  
  const results = { passed: [], failed: [], warnings: [] };

  try {
    console.log("\n📝 Test 1: Creating a SubClub...");
    const factory = await ethers.getContractAt("MegaVaultFactory", deployment.addresses.factory);
    
    const members = [
      "0x9999999999999999999999999999999999999999",
      "0x8888888888888888888888888888888888888888",
      "0x7777777777777777777777777777777777777777",
      "0x6666666666666666666666666666666666666666"
    ];
    
    const tx = await factory.createSubClub(
      members,
      365 * 24 * 60 * 60,
      1
    );
    const receipt = await tx.wait();
    
    console.log("✅ SubClub creation test passed");
    results.passed.push("SubClub creation");

    console.log("\n📝 Test 2: Checking MegaVault integration...");
    const megaVault = await ethers.getContractAt("MegaVault", deployment.addresses.megaVault);
    const totalValue = await megaVault.getTotalValue();
    
    console.log("Total vault value:", totalValue.toString());
    console.log("✅ MegaVault integration test passed");
    results.passed.push("MegaVault integration");

    console.log("\n📝 Test 3: Testing emergency module...");
    const emergency = await ethers.getContractAt("EmergencyModule", deployment.addresses.emergencyModule);
    const isPaused = await emergency.paused();
    
    if (!isPaused) {
      console.log("✅ Emergency module ready");
      results.passed.push("Emergency module");
    } else {
      console.log("⚠️ Emergency module is paused");
      results.warnings.push("Emergency module paused");
    }

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    results.failed.push(error.message);
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(50));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️ Warnings: ${results.warnings.length}`);

  fs.writeFileSync(
    path.join(__dirname, '../../test-results-testnet.json'),
    JSON.stringify(results, null, 2)
  );

  console.log("\n📄 Results saved to test-results-testnet.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
