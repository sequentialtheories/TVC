
export type RoundingMode = 'BANKERS' | 'DOWN' | 'UP';

/**
 * Apply rounding using the same precision as current implementation
 * Uses Math.round() for final values, matching existing behavior
 */
export function applyRounding(value: number, mode: RoundingMode = 'BANKERS'): number {
  return Math.round(value);
}

/**
 * Convert APY to weekly rate using existing formula
 * Matches: Math.pow(1 + apy/100, 1/weeksPerYear) - 1
 */
export function weeklyRate(apy: number): number {
  const weeksPerYear = 52;
  return Math.pow(1 + apy/100, 1/weeksPerYear) - 1;
}

/**
 * Calculate weekly deposit based on rigor level and contract age
 * Lifted verbatim from existing calculateWeeklyDepositAmount logic
 */
export function calculateWeeklyDeposit(
  rigorLevel: 'light' | 'medium' | 'heavy' | 'custom',
  year: number,
  customAmount?: number
): number {
  if (rigorLevel === 'light') {
    if (year <= 1) return 100 / 4.33;       // $100/month
    else if (year <= 2) return 150 / 4.33;  // $150/month
    else if (year <= 3) return 200 / 4.33;  // $200/month
    else return 250 / 4.33;                 // $250/month
  } else if (rigorLevel === 'medium') {
    if (year <= 3) return 50;
    else if (year <= 6) return 100;
    else if (year <= 10) return 200;
    else return 250;
  } else if (rigorLevel === 'heavy') {
    if (year <= 3) return 100;
    else if (year <= 6) return 200;
    else if (year <= 10) return 300;
    else return 400;
  } else {
    return customAmount || 0;
  }
}

/**
 * Calculate weekly DCA amount for Phase 2 wBTC purchases
 * Lifted verbatim from existing Phase 2 logic
 */
export function calculateWeeklyDCA(
  rigorLevel: 'light' | 'medium' | 'heavy' | 'custom',
  strandBalance: number
): number {
  const dcaPercent = 0.1; // 10% of Strand 1 balance
  
  if (rigorLevel === 'light') return Math.min(strandBalance * dcaPercent, 1000);
  else if (rigorLevel === 'medium') return Math.min(strandBalance * dcaPercent, 5000);
  else if (rigorLevel === 'heavy') return Math.min(strandBalance * dcaPercent, 10000);
  else return Math.min(strandBalance * dcaPercent, 2000); // Custom
}
