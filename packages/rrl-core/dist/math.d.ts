export type RoundingMode = 'BANKERS' | 'DOWN' | 'UP';
/**
 * Apply rounding using the same precision as current implementation
 * Uses Math.round() for final values, matching existing behavior
 */
export declare function applyRounding(value: number, mode?: RoundingMode): number;
/**
 * Convert APY to weekly rate using existing formula
 * Matches: Math.pow(1 + apy/100, 1/weeksPerYear) - 1
 */
export declare function weeklyRate(apy: number): number;
/**
 * Calculate weekly deposit based on rigor level and contract age
 * Lifted verbatim from existing calculateWeeklyDepositAmount logic
 */
export declare function calculateWeeklyDeposit(rigorLevel: 'light' | 'medium' | 'heavy' | 'custom', year: number, customAmount?: number): number;
/**
 * Calculate weekly DCA amount for Phase 2 wBTC purchases
 * Lifted verbatim from existing Phase 2 logic
 */
export declare function calculateWeeklyDCA(rigorLevel: 'light' | 'medium' | 'heavy' | 'custom', strandBalance: number): number;
