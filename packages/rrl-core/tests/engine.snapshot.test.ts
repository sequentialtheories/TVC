import { run } from '../src/engine.js';
import { describe, it, expect } from 'vitest';
import goldenSnapshots from './__fixtures__/golden-snapshots.json';

describe('RRL Engine Snapshots', () => {
  it('should match 5y heavy rigor 1 member snapshot', () => {
    const result = run({
      simulationYears: 5,
      rigorLevel: 'heavy',
      aaveAPY: 5.2,
      quickswapAPY: 12.5,
      btcPrice: 95000,
      memberCount: 1,
      isChargedContract: false
    });
    
    expect(result.finalTotal).toBe(goldenSnapshots['5y_heavy_1member'].finalTotal);
    expect(result.finalBalances).toEqual(goldenSnapshots['5y_heavy_1member'].finalBalances);
  });
  
  it('should match 10y medium rigor 1 member snapshot', () => {
    const result = run({
      simulationYears: 10,
      rigorLevel: 'medium',
      aaveAPY: 5.2,
      quickswapAPY: 12.5,
      btcPrice: 95000,
      memberCount: 1,
      isChargedContract: false
    });
    
    expect(result.finalTotal).toBe(goldenSnapshots['10y_medium_1member'].finalTotal);
    expect(result.finalBalances).toEqual(goldenSnapshots['10y_medium_1member'].finalBalances);
  });
  
  it('should match 15y light rigor 4 members snapshot', () => {
    const result = run({
      simulationYears: 15,
      rigorLevel: 'light',
      aaveAPY: 5.2,
      quickswapAPY: 12.5,
      btcPrice: 95000,
      memberCount: 4,
      isChargedContract: false
    });
    
    expect(result.finalTotal).toBe(goldenSnapshots['15y_light_4members'].finalTotal);
    expect(result.finalBalances).toEqual(goldenSnapshots['15y_light_4members'].finalBalances);
  });

  it('should produce deterministic results for same inputs', () => {
    const inputs = {
      simulationYears: 5,
      rigorLevel: 'heavy' as const,
      aaveAPY: 5.2,
      quickswapAPY: 12.5,
      btcPrice: 95000,
      memberCount: 1,
      isChargedContract: false
    };
    
    const result1 = run(inputs);
    const result2 = run(inputs);
    
    expect(result1.finalTotal).toBe(result2.finalTotal);
    expect(result1.finalBalances).toEqual(result2.finalBalances);
    expect(result1.steps).toEqual(result2.steps);
  });

  it('should handle invariants correctly', () => {
    const result = run({
      simulationYears: 5,
      rigorLevel: 'heavy',
      aaveAPY: 5.2,
      quickswapAPY: 12.5,
      btcPrice: 95000,
      memberCount: 1,
      isChargedContract: false
    });
    
    result.steps.forEach(step => {
      expect(step.balances.capital).toBeGreaterThanOrEqual(0);
      expect(step.balances.yield).toBeGreaterThanOrEqual(0);
      expect(step.balances.momentum).toBeGreaterThanOrEqual(0);
      expect(step.totalValue).toBeGreaterThanOrEqual(0);
    });
    
    expect(result.finalTotal).toBeGreaterThanOrEqual(0);
  });
});
