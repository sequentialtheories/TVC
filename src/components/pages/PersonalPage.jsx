import React, { useState } from 'react'
import { useSelector } from 'react-redux'
import { useVaultData } from '../../hooks/useContract'
import { useSubClub } from '../../hooks/useSubClub'
import { formatCurrency, formatAddress } from '../../utils/formatters'
import { Wallet, Plus, ArrowUpRight, Clock } from 'lucide-react'

const PersonalPage = () => {
  const { walletAddress } = useSelector(state => state.auth)
  const { userBalance } = useVaultData()
  const { makeDeposit, loading } = useSubClub()
  const [depositAmount, setDepositAmount] = useState('')

  const handleDeposit = async () => {
    if (!depositAmount || !walletAddress) return
    
    try {
      await makeDeposit(walletAddress)
      setDepositAmount('')
    } catch (error) {
      console.error('Deposit failed:', error)
    }
  }

  const recentTransactions = [
    {
      id: 1,
      type: 'deposit',
      amount: '$250.00',
      date: '2025-01-20',
      status: 'completed',
      hash: '0x1234...5678'
    },
    {
      id: 2,
      type: 'harvest',
      amount: '+$12.50',
      date: '2025-01-19',
      status: 'completed',
      hash: '0x2345...6789'
    },
    {
      id: 3,
      type: 'deposit',
      amount: '$250.00',
      date: '2025-01-13',
      status: 'completed',
      hash: '0x3456...7890'
    }
  ]

  if (!walletAddress) {
    return (
      <div className="p-6 pb-24">
        <div className="text-center py-12">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Wallet Not Connected
          </h2>
          <p className="text-gray-600">
            Connect your wallet to view your personal dashboard
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Personal Dashboard
        </h1>
        <p className="text-gray-600">
          {formatAddress(walletAddress)}
        </p>
      </div>

      {/* Balance Overview */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Balance Overview</h2>
        <div className="text-center">
          <div className="text-3xl font-bold text-indigo-600 mb-2">
            {formatCurrency(userBalance)}
          </div>
          <div className="text-sm text-gray-500">Total Vault Balance</div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              +$125.50
            </div>
            <div className="text-xs text-gray-500">Total Profit</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">
              $2,250.00
            </div>
            <div className="text-xs text-gray-500">Total Deposited</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              5.6%
            </div>
            <div className="text-xs text-gray-500">ROI</div>
          </div>
        </div>
      </div>

      {/* Quick Deposit */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Quick Deposit</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (USDC)
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Enter amount"
              className="input-field"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {['50', '100', '250'].map((amount) => (
              <button
                key={amount}
                onClick={() => setDepositAmount(amount)}
                className="btn-secondary text-sm py-2"
              >
                ${amount}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleDeposit}
            disabled={!depositAmount || loading}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Deposit to Vault'}
          </button>
        </div>
      </div>

      {/* Deposit Schedule */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Deposit Schedule</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-blue-500" />
              <div>
                <div className="font-medium">Next Deposit Due</div>
                <div className="text-sm text-gray-500">Weekly - Medium Rigor</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">$150.00</div>
              <div className="text-sm text-blue-600">In 3 days</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Auto-deposit</div>
              <div className="text-sm text-gray-500">Enabled</div>
            </div>
            <div className="text-sm text-green-600">Active</div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
        <div className="space-y-3">
          {recentTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  tx.type === 'deposit' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                }`}>
                  {tx.type === 'deposit' ? <Plus className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-medium capitalize">{tx.type}</div>
                  <div className="text-sm text-gray-500">{tx.date}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${
                  tx.type === 'harvest' ? 'text-green-600' : 'text-gray-800'
                }`}>
                  {tx.amount}
                </div>
                <div className="text-xs text-gray-500">
                  {formatAddress(tx.hash)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PersonalPage
