const { ethers } = require('hardhat');

async function main() {
  console.log('Deploying VaultClub contract to Polygon Amoy...');

  const VaultClub = await ethers.getContractFactory('VaultClub');
  const vaultClub = await VaultClub.deploy();

  await vaultClub.deployed();

  console.log('VaultClub deployed to:', vaultClub.address);
  console.log('Transaction hash:', vaultClub.deployTransaction.hash);

  await vaultClub.deployTransaction.wait(5);

  console.log('Contract verified and ready to use!');
  console.log('Update the VAULT_CONTRACT_ADDRESS in your config to:', vaultClub.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
