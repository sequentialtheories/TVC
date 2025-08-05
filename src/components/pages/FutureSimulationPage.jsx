import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { formatCurrency } from '../../utils/formatters'
import { TrendingUp, Calculator, Target, Bitcoin } from 'lucide-react'

const FutureSimulationPage = () => {
  const { userBalance } = useSelector(state => state.user)
  const [simulationParams, setSimulationParams] = useState({
    rigor: 'medium',
    timeframe: 12,
    initialDeposit: 1000,
    weeklyDeposit: 150
  })
  const [simulationResults, setSimulationResults] = useState(null)

  const rigorOptions = [
    { id: 'light', label: 'Light Rigor', weeklyRange: '$100-250/month', description: 'Conservative monthly deposits' },
    { id: 'medium', label: 'Medium Rigor', weeklyRange: '$50-250/week', description: 'Moderate weekly deposits' },
    { id: 'heavy', label: 'Heavy Rigor', weeklyRange: '$100-400/week', description: 'Aggressive weekly scaling' },
    { id: 'custom', label: 'Custom Rigor', weeklyRange: 'User-defined', description: 'Escalating deposit schedule' }
  ]

  const calculateSimulation = () => {
    const { rigor, timeframe, initialDeposit, weeklyDeposit } = simulationParams
    
    let totalDeposited = initialDeposit
    let currentValue = initialDeposit
    const monthlyData = []
    
    const baseAPY = 0.087
    const phase2Threshold = timeframe * 0.5
    
    for (let month = 1; month <= timeframe; month++) {
      const isPhase2 = month > phase2Threshold
      const apy = isPhase2 ? 0.15 : baseAPY
      
      const monthlyDeposit = rigor === 'light' ? weeklyDeposit : weeklyDeposit * 4
      totalDeposited += monthlyDeposit
      
      const monthlyGrowth = currentValue * (apy / 12)
      currentValue += monthlyDeposit + monthlyGrowth
      
      monthlyData.push({
        month,
        value: currentValue,
        deposited: totalDeposited,
        profit: currentValue - totalDeposited,
        phase: isPhase2 ? 2 : 1
      })
    }
    
    const finalResult = monthlyData[monthlyData.length - 1]
    const roi = ((finalResult.profit / finalResult.deposited) * 100)
    
    setSimulationResults({
      finalValue: finalResult.value,
      totalDeposited: finalResult.deposited,
      totalProfit: finalResult.profit,
      roi: roi,
      monthlyData: monthlyData,
      btcAccumulated: finalResult.value * 0.3
    })
  }

  useEffect(() => {
    calculateSimulation()
  }, [simulationParams])

  const handleParamChange = (param, value) => {
    setSimulationParams(prev => ({
      ...prev,
      [param]: value
    }))
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Future Simulation
        </h1>
        <p className="text-gray-600">
          Project your investment growth with different strategies
        </p>
      </div>

      {/* Simulation Parameters */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Simulation Parameters</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Deposit
            </label>
            <input
              type="number"
              value={simulationParams.initialDeposit}
              onChange={(e) => handleParamChange('initialDeposit', parseInt(e.target.value))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekly Deposit Amount
            </label>
            <input
              type="number"
              value={simulationParams.weeklyDeposit}
              onChange={(e) => handleParamChange('weeklyDeposit', parseInt(e.target.value))}
              className="input-field"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe (months)
            </label>
            <input
              type="range"
              min="6"
              max="60"
              value={simulationParams.timeframe}
              onChange={(e) => handleParamChange('timeframe', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-500 mt-1">
              {simulationParams.timeframe} months
            </div>
          </div>
        </div>
      </div>

      {/* Rigor Level Selection */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Rigor Level</h2>
        <div className="space-y-3">
          {rigorOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleParamChange('rigor', option.id)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                simulationParams.rigor === option.id
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
                <div className="text-sm font-medium text-indigo-600">
                  {option.weeklyRange}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Results */}
      {simulationResults && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Projected Results</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(simulationResults.finalValue)}
                </div>
                <div className="text-sm text-gray-500">Final Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(simulationResults.totalProfit)}
                </div>
                <div className="text-sm text-gray-500">Total Profit</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {simulationResults.roi.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">ROI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(simulationResults.btcAccumulated)}
                </div>
                <div className="text-sm text-gray-500">BTC Value</div>
              </div>
            </div>
          </div>

          {/* Growth Chart Visualization */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Growth Projection</h2>
            <div className="space-y-3">
              {simulationResults.monthlyData.filter((_, index) => index % 3 === 0).map((data, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      data.phase === 2 ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <span className="font-medium">Month {data.month}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      data.phase === 2 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      Phase {data.phase}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(data.value)}</div>
                    <div className="text-sm text-green-600">
                      +{formatCurrency(data.profit)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Phase Breakdown */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Phase Breakdown</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="font-semibold">Phase 1: Diversified Growth</div>
                  <div className="text-sm text-gray-600">
                    First {Math.floor(simulationParams.timeframe / 2)} months - Multi-strand allocation
                  </div>
                  <div className="text-sm text-blue-600">Expected APY: 8.7%</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg">
                <Bitcoin className="w-8 h-8 text-orange-600" />
                <div>
                  <div className="font-semibold">Phase 2: BTC Accumulation</div>
                  <div className="text-sm text-gray-600">
                    Final {Math.ceil(simulationParams.timeframe / 2)} months - Bitcoin focus
                  </div>
                  <div className="text-sm text-orange-600">Expected APY: 15%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={calculateSimulation}
          className="btn-primary w-full"
        >
          <Calculator className="w-5 h-5 mr-2" />
          Recalculate Simulation
        </button>
        
        <button className="btn-secondary w-full">
          <Target className="w-5 h-5 mr-2" />
          Set as Investment Goal
        </button>
      </div>
    </div>
  )
}

export default FutureSimulationPage
