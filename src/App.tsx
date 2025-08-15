import React, { useState, useEffect } from 'react';
import { Database, Settings, User, Users, TrendingUp, Info, X, Bitcoin, DollarSign, Zap, Shield, ArrowLeft, Wallet, Home, Share2, MessageSquare, Heart, Reply, Plus, Filter, Search } from 'lucide-react';
import { configService } from './lib/config';
import { logger } from './lib/logger';

async function getVaultBalance(address: string) {
  const config = await configService.getConfig();
  
  if (config.featureFlags.SIMULATION_MODE) {
    return config.mockVaultBalance || "0";
  }
  
  return "0";
}

async function getVaultStats() {
  const config = await configService.getConfig();
  
  if (config.featureFlags.SIMULATION_MODE) {
    return { 
      totalMembers: config.mockMemberCount || 0, 
      totalDeposits: config.mockVaultBalance || "0", 
      systemHealth: 100, 
      transactions: 0,
      strand1Balance: "0",
      strand2Balance: "0",
      strand3Balance: "0" 
    };
  }
  
  return { 
    totalMembers: 0, 
    totalDeposits: "0", 
    systemHealth: 100, 
    transactions: 0,
    strand1Balance: "0",
    strand2Balance: "0",
    strand3Balance: "0" 
  };
}

async function connectWallet() {
  const config = await configService.getConfig();
  
  if (config.featureFlags.DISABLE_METAMASK) {
    logger.info("MetaMask disabled by feature flag");
    alert("Wallet connection is disabled in this environment.");
    return null;
  }
  
  if (!window.ethereum) {
    alert("MetaMask is required to use this app.");
    return null;
  }
  
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    logger.info("Wallet connected successfully");
    return accounts[0];
  } catch (error) {
    logger.error("Wallet connection rejected", error);
    return null;
  }
}


export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [vaultStats, setVaultStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadVaultStats();
  }, []);

  const loadVaultStats = async () => {
    setIsLoading(true);
    try {
      const stats = await getVaultStats();
      setVaultStats(stats);
    } catch (error) {
      logger.error("Failed to load vault stats", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectWallet = async () => {
    const address = await connectWallet();
    setWalletAddress(address);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
            <Shield className="w-8 h-8" />
            The Vault Club
          </h1>
          <p className="text-gray-400">Secure DeFi Vault Management</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Total Members</h3>
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : vaultStats?.totalMembers || 0}
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold">Total Deposits</h3>
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : `$${vaultStats?.totalDeposits || "0"}`}
            </p>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold">System Health</h3>
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? "..." : `${vaultStats?.systemHealth || 100}%`}
            </p>
          </div>
        </div>

        <div className="text-center">
          {!walletAddress ? (
            <button
              onClick={handleConnectWallet}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
            >
              <Wallet className="w-5 h-5" />
              Connect Wallet
            </button>
          ) : (
            <div className="bg-gray-800 p-4 rounded-lg">
              <p className="text-sm text-gray-400 mb-1">Connected Wallet</p>
              <p className="font-mono text-sm">{walletAddress}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
