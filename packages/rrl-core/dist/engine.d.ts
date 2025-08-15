import type { StrandBalances, SimulationInput, SimulationResult } from './types.js';
/**
 * Execute single simulation step
 * Lifted verbatim from existing Phase 1/Phase 2 logic in calculateSimulation
 */
export declare function step(prev: StrandBalances & {
    wBTC: number;
}, input: SimulationInput, week: number, totalWeeks: number, rigorLevel: 'light' | 'medium' | 'heavy' | 'custom', customAmount?: number): StrandBalances & {
    wBTC: number;
    phase: 1 | 2;
};
/**
 * Run complete simulation
 * Lifted verbatim from existing calculateSimulation loop structure
 */
export declare function run(inputs: {
    simulationYears: number;
    rigorLevel: 'light' | 'medium' | 'heavy' | 'custom';
    customAmount?: number;
    aaveAPY: number;
    quickswapAPY: number;
    btcPrice: number;
    memberCount: number;
    isChargedContract: boolean;
}): SimulationResult;
