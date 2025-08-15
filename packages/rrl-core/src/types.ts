
export interface StrandBalances {
  capital: number;
  yield: number;
  momentum: number;
}

export interface SimulationInput {
  weeklyDeposit: number;
  aaveAPY: number;
  quickswapAPY: number;
  btcPrice: number;
  memberCount: number;
  isChargedContract: boolean;
}

export interface SimulationStep {
  week: number;
  balances: StrandBalances;
  totalValue: number;
  phase: 1 | 2;
  weeklyDeposit: number;
  gasFeesPerWeek: number;
  utilityFeesPerWeek: number;
  progressPercent: number;
}

export interface SimulationResult {
  steps: SimulationStep[];
  finalBalances: StrandBalances;
  finalTotal: number;
  totalWeeks: number;
}

export type RoundingMode = 'BANKERS' | 'DOWN' | 'UP';

export interface RigorSchedule {
  type: 'light' | 'medium' | 'heavy' | 'custom';
  baseAmount: number;
  frequency: 'weekly' | 'monthly';
  customSchedule?: number[];
}
