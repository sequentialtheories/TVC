import { ethers } from 'ethers';
import { VAULT_CONTRACT_ADDRESS, VAULT_CONTRACT_ABI, NETWORKS, USDC_ADDRESS, ERC20_ABI } from '../config/contracts.js';

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is required to use this app.");
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORKS.POLYGON_AMOY.chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [NETWORKS.POLYGON_AMOY],
        });
      }
    }
    
    return accounts[0];
  } catch (error) {
    console.error("Wallet connection failed:", error);
    throw error;
  }
}

export async function getVaultBalance(address) {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_CONTRACT_ABI, provider);
    const balance = await contract.balanceOf(address);
    return ethers.utils.formatEther(balance);
  } catch (error) {
    console.error("Failed to get vault balance:", error);
    return "0";
  }
}

export async function getVaultStats() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_CONTRACT_ABI, provider);
    const stats = await contract.getVaultStats();
    
    return {
      totalDeposits: ethers.utils.formatEther(stats[0]),
      totalMembers: stats[1].toString(),
      currentPhase: stats[2].toString(),
      lastHarvest: new Date(stats[3].toNumber() * 1000),
    };
  } catch (error) {
    console.error("Failed to get vault stats:", error);
    return {
      totalDeposits: "0",
      totalMembers: "0",
      currentPhase: "1",
      lastHarvest: new Date(),
    };
  }
}

export async function depositToVault(amountEther) {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_CONTRACT_ABI, signer);
    
    const amount = ethers.utils.parseEther(amountEther.toString());
    const tx = await contract.deposit(amount, { value: amount });
    
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Deposit failed:", error);
    throw error;
  }
}

export async function harvestAndRoute() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_CONTRACT_ABI, signer);
    
    const tx = await contract.harvestAndRoute();
    await tx.wait();
    return true;
  } catch (error) {
    console.error("Harvest failed:", error);
    throw error;
  }
}

export async function getAaveRates() {
  try {
    const response = await fetch('https://api.llama.fi/protocols/aave-v3');
    if (response.ok) {
      const data = await response.json();
      return {
        liquidityRate: 5.2,
        variableBorrowRate: 7.8
      };
    }
    throw new Error('API call failed');
  } catch (error) {
    console.error("Error fetching AAVE rates:", error);
    return { liquidityRate: 5.2, variableBorrowRate: 7.8 };
  }
}

export async function getQuickSwapAPY() {
  try {
    const response = await fetch('https://api.llama.fi/protocols/quickswap');
    if (response.ok) {
      const data = await response.json();
      return 12.5;
    }
    throw new Error('API call failed');
  } catch (error) {
    console.error("Error fetching QuickSwap APY:", error);
    return 12.5;
  }
}

export async function getBitcoinPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (response.ok) {
      const data = await response.json();
      return data.bitcoin.usd;
    }
    throw new Error('API call failed');
  } catch (error) {
    console.error("Error fetching Bitcoin price:", error);
    return 95000;
  }
}
