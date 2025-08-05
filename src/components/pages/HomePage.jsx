import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setActiveStrand, setActiveModal } from '../../store/slices/uiSlice'
import { useVaultData } from '../../hooks/useContract'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { Bitcoin, DollarSign, Zap, Shield } from 'lucide-react'

const HomePage = () => {
  const dispatch = useDispatch()
  const { walletAddress } = useSelector(state => state.auth)
  const { vaultStats, userBalance } = useVaultData()

  const strands = [
    {
      id: 1,
      name: 'Capital Strand',
      description: 'USDC Lending via AAVE',
      allocation: '10%',
      apy: '5.2%',
      icon: Shield,
      color: 'bg-green-500',
      value: vaultStats?.strand1Balance || '0'
    },
    {
      id: 2,
      name: 'Yield Strand',
      description: 'Enhanced AAVE Staking',
      allocation: '60%',
      apy: '8.7%',
      icon: DollarSign,
      color: 'bg-blue-500',
      value: vaultStats?.strand2Balance || '0'
    },
    {
      id: 3,
      name: 'Momentum Strand',
      description: 'QuickSwap Liquidity',
      allocation: '30%',
      apy: '12.5%',
      icon: Zap,
      color: 'bg-purple-500',
      value: vaultStats?.strand3Balance || '0'
    }
  ]

  const handleStrandClick = (strand) => {
    dispatch(setActiveStrand(strand))
  }

  const handleEmergencyClick = () => {
    dispatch(setActiveModal('emergency'))
  }

  if (!walletAddress) {
    return (
      <div className="p-6 pb-24">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Welcome to The Vault Club
          </h2>
          <p className="text-gray-600 mb-6">
            Connect your wallet to access your investment dashboard
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          The Vault Club
        </h1>
        <p className="text-gray-600">
          Automated DeFi Investment Platform
        </p>
      </div>

      {/* Portfolio Overview */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {formatCurrency(userBalance)}
            </div>
            <div className="text-sm text-gray-500">Your Balance</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(vaultStats?.totalDeposits || '0')}
            </div>
            <div className="text-sm text-gray-500">Total Value Locked</div>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold">
              {vaultStats?.totalMembers || 0}
            </div>
            <div className="text-sm text-gray-500">Members</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {vaultStats?.systemHealth || 100}%
            </div>
            <div className="text-sm text-gray-500">Health</div>
          </div>
          <div>
            <div className="text-lg font-bold">
              Phase {vaultStats?.currentPhase || 1}
            </div>
            <div className="text-sm text-gray-500">Current Phase</div>
          </div>
        </div>
      </div>

      {/* Investment Strands */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Investment Strands</h2>
        {strands.map((strand) => (
          <div
            key={strand.id}
            onClick={() => handleStrandClick(strand)}
            className="card cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${strand.color} text-white`}>
                <strand.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{strand.name}</h3>
                <p className="text-sm text-gray-600">{strand.description}</p>
              </div>
              <div className="text-right">
                <div className="font-semibold">{strand.allocation}</div>
                <div className="text-sm text-green-600">{strand.apy} APY</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Phase Transition */}
      {vaultStats?.currentPhase === 1 && (
        <div className="card bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
          <div className="flex items-center space-x-3">
            <Bitcoin className="w-8 h-8 text-orange-500" />
            <div>
              <h3 className="font-semibold text-orange-800">
                Phase 2 Transition
              </h3>
              <p className="text-sm text-orange-700">
                Preparing for Bitcoin accumulation phase
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Button */}
      <button
        onClick={handleEmergencyClick}
        className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
      >
        🚨 Emergency Procedures
      </button>
    </div>
  )
}

export default HomePage
