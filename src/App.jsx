import React, { useState, useEffect } from 'react';
import { createVaultClubUser, authenticateVaultClubUser, getCurrentUser, signOut } from './lib/auth.js';
import { createSubclubContract, joinContract, getUserContracts } from './lib/contracts.js';
import { connectWallet, getVaultBalance, getVaultStats, depositToVault, harvestAndRoute, getAaveRates, getQuickSwapAPY, getBitcoinPrice } from './lib/web3.js';
import { Database, Settings, User, Users, TrendingUp, Info, X, Bitcoin, DollarSign, Zap, Shield, ArrowLeft, Wallet, Home, Share2, MessageSquare, Heart, Reply, Plus, Filter, Search } from 'lucide-react';

const VaultClubApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [vaultBalance, setVaultBalance] = useState("0");
  const [vaultStats, setVaultStats] = useState({
    totalDeposits: "0",
    totalMembers: 0,
    currentPhase: 1,
    lastHarvest: new Date()
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  const [showCreateContract, setShowCreateContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    lockupPeriod: 1,
    rigorLevel: 'light',
    maxMembers: 4,
    isChargedContract: false
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  const [subclubs, setSubclubs] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);

  const [aaveRates, setAaveRates] = useState({ liquidityRate: 5.2, variableBorrowRate: 7.8 });
  const [quickswapAPY, setQuickswapAPY] = useState(12.5);
  const [bitcoinPrice, setBitcoinPrice] = useState(95000);

  const updateVaultBalance = async () => {
    if (walletAddress) {
      const balance = await getVaultBalance(walletAddress);
      setVaultBalance(balance);
    }
  };

  const updateVaultStats = async () => {
    const stats = await getVaultStats();
    setVaultStats(stats);
  };

  const handleConnectWallet = async () => {
    try {
      setIsConnecting(true);
      const address = await connectWallet();
      setWalletAddress(address);
      
      await updateVaultBalance();
      await updateVaultStats();
      
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    
    try {
      let userData;
      if (authMode === 'signup') {
        userData = await createVaultClubUser(authForm.email, authForm.password, authForm.name);
      } else {
        userData = await authenticateVaultClubUser(authForm.email, authForm.password);
      }
      
      setCurrentUser(userData.user);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setAuthForm({ email: '', password: '', name: '' });
      
    } catch (error) {
      console.error('Authentication failed:', error);
      alert(`${authMode === 'signup' ? 'Account creation' : 'Login'} failed: ${error.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setCurrentUser(null);
      setIsAuthenticated(false);
      setWalletAddress(null);
      setVaultBalance("0");
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const handleCreateSubclubContract = async (contractData) => {
    try {
      const contract = await createSubclubContract(contractData);
      const newContract = {
        id: contract.id,
        ...contractData,
        createdAt: contract.created_at,
        creator: walletAddress,
        members: [walletAddress],
        totalDeposited: 0,
        isActive: true
      };
      
      setSubclubs(prev => [...prev, newContract]);
      setSelectedContract(newContract.id);
      return newContract;
    } catch (error) {
      console.error('Failed to create contract:', error);
      alert('Failed to create contract. Please try again.');
      return null;
    }
  };

  const handleDeposit = async (amount) => {
    if (!walletAddress) return false;
    
    try {
      setIsDepositing(true);
      await depositToVault(amount);
      await updateVaultBalance();
      return true;
    } catch (error) {
      console.error('Deposit failed:', error);
      return false;
    } finally {
      setIsDepositing(false);
    }
  };

  const handleHarvest = async () => {
    if (!walletAddress) return false;
    
    try {
      setIsHarvesting(true);
      await harvestAndRoute();
      await updateVaultStats();
      return true;
    } catch (error) {
      console.error('Harvest failed:', error);
      return false;
    } finally {
      setIsHarvesting(false);
    }
  };

  useEffect(() => {
    const loadMarketData = async () => {
      try {
        const [aaveData, quickswapAPY, btcPrice] = await Promise.all([
          getAaveRates(),
          getQuickSwapAPY(),
          getBitcoinPrice()
        ]);
        
        setAaveRates(aaveData);
        setQuickswapAPY(quickswapAPY);
        setBitcoinPrice(btcPrice);
      } catch (error) {
        console.error("Failed to load market data:", error);
      }
    };

    const checkAuthStatus = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(!!user);
    };

    loadMarketData();
    checkAuthStatus();
    
    const interval = setInterval(loadMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <h1 className="text-2xl font-bold text-white">The Vault Club</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Welcome, {currentUser?.name || currentUser?.email}</div>
                    <button
                      onClick={handleSignOut}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  Sign In
                </button>
              )}
              
              {walletAddress ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm text-gray-300">Wallet Connected</div>
                    <div className="text-xs text-gray-400 font-mono">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-4">Vault Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">Your Balance</div>
                  <div className="text-2xl font-bold text-white">${vaultBalance}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">Total Members</div>
                  <div className="text-2xl font-bold text-white">{vaultStats.totalMembers}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">Total Deposits</div>
                  <div className="text-2xl font-bold text-white">${vaultStats.totalDeposits}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">Current Phase</div>
                  <div className="text-2xl font-bold text-white">{vaultStats.currentPhase}</div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Market Data</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">AAVE APY</div>
                  <div className="text-lg font-bold text-green-400">{aaveRates.liquidityRate}%</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">QuickSwap APY</div>
                  <div className="text-lg font-bold text-green-400">{quickswapAPY}%</div>
                </div>
                <div className="bg-black/20 rounded-lg p-4">
                  <div className="text-gray-300 text-sm">Bitcoin Price</div>
                  <div className="text-lg font-bold text-yellow-400">${bitcoinPrice.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {isAuthenticated && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-white">Your Subclubs</h3>
                  <button
                    onClick={() => setShowCreateContract(true)}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Create Subclub
                  </button>
                </div>
                
                {subclubs.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">No subclubs yet</div>
                    <button
                      onClick={() => setShowCreateContract(true)}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      Create your first subclub
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subclubs.map((club) => (
                      <div key={club.id} className="bg-black/20 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-white font-medium">{club.rigorLevel} Rigor Club</h4>
                            <div className="text-gray-300 text-sm">
                              {club.lockupPeriod} {club.isChargedContract ? 'months' : 'years'} • {club.maxMembers} max members
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">${club.totalDeposited}</div>
                            <div className="text-gray-300 text-sm">deposited</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {walletAddress && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Deposit Amount (ETH)</label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-black/20 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      placeholder="0.1"
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <button
                    onClick={() => handleDeposit(parseFloat(depositAmount))}
                    disabled={isDepositing || !depositAmount}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {isDepositing ? 'Depositing...' : 'Deposit'}
                  </button>
                  <button
                    onClick={handleHarvest}
                    disabled={isHarvesting}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {isHarvesting ? 'Harvesting...' : 'Harvest & Route'}
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Authentication</span>
                  <span className={`text-sm ${isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                    {isAuthenticated ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Wallet</span>
                  <span className={`text-sm ${walletAddress ? 'text-green-400' : 'text-red-400'}`}>
                    {walletAddress ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Network</span>
                  <span className="text-sm text-purple-400">Polygon Amoy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              >
                {isAuthenticating ? 'Processing...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-cyan-400 hover:text-cyan-300"
              >
                {authMode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateContract && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Create Subclub</h2>
              <button
                onClick={() => setShowCreateContract(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Lockup Period
                </label>
                <select
                  value={contractForm.lockupPeriod}
                  onChange={(e) => setContractForm({...contractForm, lockupPeriod: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={10}>10 Years</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rigor Level
                </label>
                <select
                  value={contractForm.rigorLevel}
                  onChange={(e) => setContractForm({...contractForm, rigorLevel: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="light">Light</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Members
                </label>
                <select
                  value={contractForm.maxMembers}
                  onChange={(e) => setContractForm({...contractForm, maxMembers: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={4}>4 Members</option>
                  <option value={6}>6 Members</option>
                  <option value={8}>8 Members</option>
                  <option value={10}>10 Members</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  handleCreateSubclubContract(contractForm);
                  setShowCreateContract(false);
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white py-2 rounded-lg font-medium transition-all duration-200"
              >
                Create Subclub Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultClubApp;
