const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking external protocol addresses on Amoy testnet...\n");
  
  const provider = new ethers.providers.JsonRpcProvider(process.env.AMOY_RPC_URL);
  
  const addresses = {
    "USDC": process.env.USDC_ADDRESS,
    "AAVE Pool": process.env.AAVE_POOL_ADDRESS,
    "QuickSwap Router": process.env.QUICKSWAP_ROUTER,
    "WBTC": process.env.WBTC_ADDRESS
  };
  
  console.log("Checking contract addresses...\n");
  
  for (const [name, address] of Object.entries(addresses)) {
    try {
      const code = await provider.getCode(address);
      const hasCode = code !== "0x";
      
      console.log(`${hasCode ? "✅" : "❌"} ${name}: ${address}`);
      if (!hasCode) {
        console.log(`   ⚠️  No contract code found - address may be outdated`);
      }
    } catch (error) {
      console.log(`❌ ${name}: ${address}`);
      console.log(`   ⚠️  Error checking address: ${error.message}`);
    }
  }
  
  console.log("\n📝 If any addresses show ❌, update them in .env before deployment");
  console.log("   Check latest addresses at:");
  console.log("   - AAVE: https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses");
  console.log("   - QuickSwap: https://docs.quickswap.exchange/reference/smart-contracts");
  console.log("   - Polygon: https://wiki.polygon.technology/docs/develop/network-details/network/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
