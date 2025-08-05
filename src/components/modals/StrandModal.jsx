import React from 'react'
import { X, Shield, DollarSign, Zap } from 'lucide-react'
import { formatCurrency, formatPercentage } from '../../utils/formatters'

const StrandModal = ({ strand, onClose }) => {
  if (!strand) return null

  const getStrandIcon = (id) => {
    switch (id) {
      case 1: return Shield
      case 2: return DollarSign
      case 3: return Zap
      default: return Shield
    }
  }

  const Icon = getStrandIcon(strand.id)

  const strandDetails = {
    1: {
      protocol: 'AAVE',
      strategy: 'USDC Lending',
      riskLevel: 'Low',
      description: 'Conservative lending strategy using AAVE protocol for stable returns with minimal risk.',
      features: [
        'Stable USDC lending',
        'AAVE protocol integration',
        'Low volatility exposure',
        'Predictable returns'
      ]
    },
    2: {
      protocol: 'AAVE Enhanced',
      strategy: 'Enhanced Staking',
      riskLevel: 'Medium',
      description: 'Enhanced AAVE staking with optimized yield farming for balanced risk-reward.',
      features: [
        'Enhanced yield farming',
        'Optimized staking rewards',
        'Balanced risk profile',
        'Higher APY potential'
      ]
    },
    3: {
      protocol: 'QuickSwap',
      strategy: 'Liquidity Farming',
      riskLevel: 'High',
      description: 'High-yield liquidity farming on QuickSwap with active management for maximum returns.',
      features: [
        'Liquidity pool farming',
        'Active management',
        'High yield potential',
        'Impermanent loss protection'
      ]
    }
  }

  const details = strandDetails[strand.id] || strandDetails[1]

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-full ${strand.color} text-white`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{strand.name}</h2>
                <p className="text-gray-600">{strand.description}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{strand.allocation}</div>
              <div className="text-sm text-gray-500">Allocation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{strand.apy}</div>
              <div className="text-sm text-gray-500">Current APY</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(strand.value)}
              </div>
              <div className="text-sm text-gray-500">Value</div>
            </div>
          </div>

          {/* Strategy Details */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-3">Strategy Overview</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {details.description}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Key Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Protocol</span>
                  <span className="font-medium">{details.protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Strategy</span>
                  <span className="font-medium">{details.strategy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Risk Level</span>
                  <span className={`font-medium px-2 py-1 rounded-full text-sm ${
                    details.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                    details.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {details.riskLevel}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3">Key Features</h3>
              <ul className="space-y-2">
                {details.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Performance Chart Placeholder */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Recent Performance</h3>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-gray-500 text-sm">
                  Performance chart coming soon
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
            <button className="flex-1 btn-primary">
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StrandModal
