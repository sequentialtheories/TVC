
import { weeklyRate, calculateWeeklyDeposit, calculateWeeklyDCA, applyRounding } from './math.js';
import type { StrandBalances, SimulationInput, SimulationStep, SimulationResult } from './types.js';

/**
 * Execute single simulation step
 * Lifted verbatim from existing Phase 1/Phase 2 logic in calculateSimulation
 */
export function step(
  prev: StrandBalances & { wBTC: number },
  input: SimulationInput,
  week: number,
  totalWeeks: number,
  rigorLevel: 'light' | 'medium' | 'heavy' | 'custom',
  customAmount?: number
): StrandBalances & { wBTC: number; phase: 1 | 2 } {
  const year = Math.floor(week / 52) + 1;
  const progressPercent = week / totalWeeks;
  
  const phase2Triggered = progressPercent >= 0.5 || (prev.capital + prev.yield + prev.momentum + prev.wBTC) >= 2000000;
  
  const weeklyDeposit = calculateWeeklyDeposit(rigorLevel, year, customAmount);
  
  const r1 = weeklyRate(input.aaveAPY);
  const r2 = weeklyRate(input.aaveAPY + 5); // Base lending rate + premium
  const r3 = weeklyRate(input.quickswapAPY);
  
  let V1 = prev.capital;
  let V2 = prev.yield;
  let V3 = prev.momentum;
  let wBTC = prev.wBTC;
  
  if (week > 0) {
    if (!phase2Triggered) {
      const D1 = weeklyDeposit * 0.10;
      const D2 = weeklyDeposit * 0.60;
      const D3 = weeklyDeposit * 0.30;

      const P1 = V1 * r1;
      const P2 = V2 * r2;
      const P3 = V3 * r3;

      
      V1 = V1 * (1 + r1) + D1 + 0.3 * P3 + 0.1 * P2 - 0.6 * P1;
      V2 = V2 * (1 + r2) + D2 + 0.4 * P1 - 0.5 * P2;
      V3 = V3 * (1 + r3) + D3 + 0.2 * P1 + 0.4 * P2 - 0.3 * P3;
    } else {
      V1 = V1 * (1 + r1) + weeklyDeposit;
      V2 = V2 * (1 + r2);
      V3 = V3 * (1 + r3);
      
      const migrationFromV2 = V2 * 0.05;
      const migrationFromV3 = V3 * 0.05;
      
      V2 -= migrationFromV2;
      V3 -= migrationFromV3;
      V1 += migrationFromV2 + migrationFromV3;
      
      const weeklyDCA = calculateWeeklyDCA(rigorLevel, V1);
      
      V1 -= weeklyDCA;
      wBTC += weeklyDCA;
    }

    const totalBeforeGas = V1 + V2 + V3 + wBTC;
    if (totalBeforeGas > 0) {
      const gasFeesPerWeek = {
        harvestYield: 0.175,
        executeRRLCycle: 0.315,
        chainlinkUpkeep: 0.085,
        weeklyTotal: 0.575
      };
      
      const utilityFeePerWeek = (input.memberCount || 1) * (input.isChargedContract ? 1.25 : 1);
      
      const gasReduction = gasFeesPerWeek.weeklyTotal;
      const utilityReduction = utilityFeePerWeek;
      const totalReduction = gasReduction + utilityReduction;
      const gasRatio = totalReduction / totalBeforeGas;
      V1 -= V1 * gasRatio;
      V2 -= V2 * gasRatio;
      V3 -= V3 * gasRatio;
      wBTC -= wBTC * gasRatio;
    }
  } else {
    const D1 = weeklyDeposit * 0.10;
    const D2 = weeklyDeposit * 0.60;
    const D3 = weeklyDeposit * 0.30;
    V1 = D1;
    V2 = D2;
    V3 = D3;
  }
  
  return {
    capital: V1,
    yield: V2,
    momentum: V3,
    wBTC,
    phase: phase2Triggered ? 2 : 1
  };
}

/**
 * Run complete simulation
 * Lifted verbatim from existing calculateSimulation loop structure
 */
export function run(
  inputs: {
    simulationYears: number;
    rigorLevel: 'light' | 'medium' | 'heavy' | 'custom';
    customAmount?: number;
    aaveAPY: number;
    quickswapAPY: number;
    btcPrice: number;
    memberCount: number;
    isChargedContract: boolean;
  }
): SimulationResult {
  const data: SimulationStep[] = [];
  const weeksPerYear = 52;
  const totalWeeks = inputs.simulationYears * weeksPerYear;
  
  let current = { capital: 0, yield: 0, momentum: 0, wBTC: 0 };
  
  for (let week = 0; week <= totalWeeks; week++) {
    const simulationInput: SimulationInput = {
      weeklyDeposit: calculateWeeklyDeposit(inputs.rigorLevel, Math.floor(week / weeksPerYear) + 1, inputs.customAmount),
      aaveAPY: inputs.aaveAPY,
      quickswapAPY: inputs.quickswapAPY,
      btcPrice: inputs.btcPrice,
      memberCount: inputs.memberCount,
      isChargedContract: inputs.isChargedContract
    };
    
    const result = step(current, simulationInput, week, totalWeeks, inputs.rigorLevel, inputs.customAmount);
    current = { capital: result.capital, yield: result.yield, momentum: result.momentum, wBTC: result.wBTC };
    
    const totalValue = current.capital + current.yield + current.momentum + current.wBTC;
    const progressPercent = week / totalWeeks;
    
    if (week % weeksPerYear === 0) {
      data.push({
        week,
        balances: {
          capital: applyRounding(current.capital),
          yield: applyRounding(current.yield),
          momentum: applyRounding(current.momentum)
        },
        totalValue: applyRounding(totalValue),
        phase: result.phase,
        weeklyDeposit: simulationInput.weeklyDeposit,
        gasFeesPerWeek: 0.575,
        utilityFeesPerWeek: (inputs.memberCount || 1) * (inputs.isChargedContract ? 1.25 : 1),
        progressPercent
      });
    }
  }
  
  if (data.length > 0) {
    const finalData = data[data.length - 1];
    const remainingStrands = finalData.balances.capital + finalData.balances.yield + finalData.balances.momentum;
    finalData.balances.capital = 0;
    finalData.balances.yield = 0;
    finalData.balances.momentum = 0;
    finalData.totalValue = applyRounding(current.wBTC + remainingStrands);
  }
  
  const finalTotal = current.capital + current.yield + current.momentum + current.wBTC;
  
  return {
    steps: data,
    finalBalances: {
      capital: 0,
      yield: 0,
      momentum: 0
    },
    finalTotal: applyRounding(finalTotal),
    totalWeeks
  };
}
