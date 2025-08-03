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
      tester.address,
      "0x1234567890123456789012345678901234567890",
      "0x2345678901234567890123456789012345678901",
      "0x3456789012345678901234567890123456789012"
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
    const phase = await megaVault.currentPhase();
    
    if (phase === 0) {
      console.log("✅ MegaVault in correct Phase 1 state");
      results.passed.push("MegaVault integration");
    } else {
      console.log("⚠️ MegaVault in unexpected phase");
      results.warnings.push("MegaVault phase state");
    }

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
