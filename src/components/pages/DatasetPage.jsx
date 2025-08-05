import React, { useState, useEffect } from 'react'
import { useVaultData } from '../../hooks/useContract'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { TrendingUp, TrendingDown, Activity } from 'lucide-react'

const DatasetPage = () => {
  const { vaultStats } = useVaultData()
  const [aaveRates, setAaveRates] = useState({ liquidityRate: 5.2, variableBorrowRate: 7.8 })
  const [quickSwapAPY, setQuickSwapAPY] = useState(12.5)
  const [btcPrice, setBtcPrice] = useState(0)

  useEffect(() => {
    const fetchExternalData = async () => {
      try {
        const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd')
        const btcData = await btcResponse.json()
        setBtcPrice(btcData.bitcoin?.usd || 0)
      } catch (error) {
        console.error('Error fetching external data:', error)
        setBtcPrice(45000)
      }
    }

    fetchExternalData()
    const interval = setInterval(fetchExternalData, 60000)
    return () => clearInterval(interval)
  }, [])

  const metrics = [
    {
      label: 'Total Value Locked',
      value: formatCurrency(vaultStats?.totalDeposits || '0'),
      change: '+5.2%',
      trend: 'up',
      icon: TrendingUp
    },
    {
      label: 'Active Members',
      value: vaultStats?.totalMembers || 0,
      change: '+12',
      trend: 'up',
      icon: Activity
    },
    {
      label: 'AAVE Lending Rate',
      value: formatPercentage(aaveRates.liquidityRate),
      change: '+0.1%',
      trend: 'up',
      icon: TrendingUp
    },
    {
      label: 'QuickSwap APY',
      value: formatPercentage(quickSwapAPY),
      change: '-0.3%',
      trend: 'down',
      icon: TrendingDown
    },
    {
      label: 'Bitcoin Price',
      value: formatCurrency(btcPrice),
      change: '+2.1%',
      trend: 'up',
      icon: TrendingUp
    },
    {
      label: 'System Health',
      value: `${vaultStats?.systemHealth || 100}%`,
      change: 'Stable',
      trend: 'stable',
      icon: Activity
    }
  ]

  const protocolData = [
    {
      protocol: 'AAVE',
      tvl: '$15.2B',
      utilization: '78%',
      status: 'Active'
    },
    {
      protocol: 'QuickSwap',
      tvl: '$2.1B',
      utilization: '65%',
      status: 'Active'
    },
    {
      protocol: 'Polygon',
      tvl: '$5.8B',
      utilization: '82%',
      status: 'Active'
    }
  ]

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Market Data
        </h1>
        <p className="text-gray-600">
          Real-time protocol metrics and performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between mb-2">
              <metric.icon className={`w-5 h-5 ${
                metric.trend === 'up' ? 'text-green-500' :
                metric.trend === 'down' ? 'text-red-500' : 'text-gray-500'
              }`} />
              <span className={`text-xs font-medium ${
                metric.trend === 'up' ? 'text-green-600' :
                metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metric.change}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {metric.value}
            </div>
            <div className="text-sm text-gray-500">
              {metric.label}
            </div>
          </div>
        ))}
      </div>

      {/* Protocol Status */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Protocol Status</h2>
        <div className="space-y-3">
          {protocolData.map((protocol, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">{protocol.protocol}</div>
                <div className="text-sm text-gray-500">TVL: {protocol.tvl}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{protocol.utilization}</div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  protocol.status === 'Active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {protocol.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Harvest executed</div>
              <div className="text-xs text-gray-500">2 minutes ago</div>
            </div>
            <div className="text-sm text-green-600">+$1,250</div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">New deposit</div>
              <div className="text-xs text-gray-500">15 minutes ago</div>
            </div>
            <div className="text-sm text-blue-600">$500</div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <div className="flex-1">
              <div className="text-sm font-medium">Rebalance completed</div>
              <div className="text-xs text-gray-500">1 hour ago</div>
            </div>
            <div className="text-sm text-purple-600">Optimized</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DatasetPage
