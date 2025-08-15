export type { StrandBalances, SimulationInput, SimulationStep, SimulationResult, RigorSchedule } from './types.js';
export type { RoundingMode } from './math.js';
export { run, step } from './engine.js';
export { applyRounding, weeklyRate, calculateWeeklyDeposit, calculateWeeklyDCA } from './math.js';
