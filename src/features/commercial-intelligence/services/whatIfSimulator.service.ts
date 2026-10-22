/**
 * Simulador What-If de Cenários Comerciais (Passo 46 / Agente 04)
 * Modela dispersão de fechamento e mantém P10 <= P50 <= P90.
 */

export interface SimulationParams {
  baseRevenue: number;
  winRateAdjustment: number; // ex: 0.1 (+10%)
  dealSizeAdjustment: number; // ex: 0.05 (+5%)
  leadVolumeAdjustment: number; // ex: 0.2 (+20%)
}

export interface SimulationResult {
  p10: number;
  p50: number;
  p90: number;
  expectedRevenue: number;
}

export class WhatIfSimulatorService {
  public simulateScenario(params: SimulationParams): SimulationResult {
    const growthFactor =
      (1 + params.winRateAdjustment) *
      (1 + params.dealSizeAdjustment) *
      (1 + params.leadVolumeAdjustment);

    const p50 = Math.round(params.baseRevenue * growthFactor);
    const p10 = Math.round(p50 * 0.85);
    const p90 = Math.round(p50 * 1.2);

    return {
      p10,
      p50,
      p90,
      expectedRevenue: p50,
    };
  }
}

export const whatIfSimulator = new WhatIfSimulatorService();
