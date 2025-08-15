# Simulation Decisions

## Non-Negotiable Technical Decisions for TVC Simulation Pipeline

### Rounding Mode
**BANKERS** rounding with 1e-6 precision for all financial calculations. Implementation uses `Math.round()` for final values and `toFixed(1)` for APY display, `toFixed(2)` for balance display.

### Step Cadence
**Weekly** execution cycle. All deposits, yield calculations, and RRL operations occur on 52-week annual basis (weeksPerYear = 52).

### Routing Rules
**Phase 1**: 50% reinvest to origin strand, 50% routed by configured percentages:
- V₁(t+1) = V₁(t)(1 + r₁) + D₁ + 0.3P₃ + 0.1P₂ - 0.6P₁
- V₂(t+1) = V₂(t)(1 + r₂) + D₂ + 0.4P₁ - 0.5P₂  
- V₃(t+1) = V₃(t)(1 + r₃) + D₃ + 0.2P₁ + 0.4P₂ - 0.3P₃

**Phase 2**: All new deposits to Strand 1, 5% weekly migration from Strands 2&3 to Strand 1, then DCA to wBTC.

### Phase-2 Triggers
Transition occurs when: **50% completion OR $2M subclub value** (`progressPercent >= 0.5 || totalValue >= 2000000`)

### Logic
**Deposit Allocation**: 10% Capital Strand, 60% Yield Strand, 30% Momentum Strand
**Rigor Schedules**: Light (monthly), Medium ($50-$250/week), Heavy ($100-$400/week), Custom (user-defined)

### Fee Model
- **Gas Fees**: $0.575/week (harvest $0.175, RRL cycle $0.315, upkeep $0.085)
- **Utility Fees**: $1/user/week (standard), $1.25/user/week (charged contracts)

### Data Sources
- **AAVE**: DeFiLlama API (`api.llama.fi/protocols/aave-v3`) - fallback 5.2% APY
- **QuickSwap**: DeFiLlama API (`api.llama.fi/protocols/quickswap`) - fallback 12.5% APY  
- **Bitcoin**: CoinGecko API (`api.coingecko.com/api/v3/simple/price`) - fallback $95,000

### Determinism Policy
**SIMULATION_MODE=1**: Use fixture data, disable live API calls
**SIMULATION_MODE=0**: Live data fetching with 5-minute refresh intervals
**Seeded runs**: Identical inputs produce identical outputs via deterministic RNG and fixed APY values
