/**
 * Contrato Canônico do Predictive Revenue Oracle — Birth Hub 360°
 * Onda 03: Autonomia Comercial Inteligente
 * Dono: Agente 18 — Contratos e API
 */

export type RevenueHorizonDays = 30 | 90 | 180;

export interface ProjectedRevenueHorizon {
  horizonDays: RevenueHorizonDays;
  expectedRevenue: number;
  confidenceInterval: {
    p10: number; // Pessimista / Conservador
    p50: number; // Cenário Base / Mediana
    p90: number; // Otimista
  };
  pipelineWeightedAmount: number;
  projectedWonDealsCount: number;
  keyDrivers: string[];
  uncertaintyDegree: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface WhatIfSimulationInput {
  organizationId: string;
  name: string;
  horizonDays: RevenueHorizonDays;
  prospectingVolumeDeltaPercent?: number; // ex: +15% de prospecção
  conversionRateDeltaPercent?: number; // ex: -5% na conversão
  salesCycleDeltaDays?: number; // ex: +10 dias de ciclo
  avgTicketDeltaPercent?: number; // ex: +10% de ticket médio
  additionalSellersCount?: number; // ex: contratação de +2 vendedores
}

export interface WhatIfSimulationResult {
  simulationId: string;
  organizationId: string;
  name: string;
  baselineRevenue: number;
  simulatedRevenue: number;
  netRevenueDelta: number;
  deltaPercent: number;
  impactBreakdown: {
    prospectingImpact: number;
    conversionImpact: number;
    cycleImpact: number;
    ticketImpact: number;
    capacityImpact: number;
  };
  simulatedAt: string;
}

export interface BacktestValidationMetrics {
  evaluationPeriod: string;
  samplesEvaluated: number;
  meanAbsoluteError: number; // MAE em R$
  meanAbsolutePercentageError: number; // MAPE %
  predictionBias: number; // Viés (+ otimista, - pessimista)
  calibrationScore: number; // 0 a 1 (1 = perfeitamente calibrado)
  predictionIntervalCoveragePercent: number; // % de negócios reais dentro de [P10, P90]
  isModelCalibrated: boolean;
  status: 'CALIBRATED' | 'UNCALIBRATED_ESTIMATE_ONLY';
}

export interface AccountAllocationRecommendation {
  recommendationId: string;
  organizationId: string;
  targetAccountId: string;
  targetAccountName: string;
  currentOwnerName?: string;
  suggestedOwnerName: string;
  matchScore: number; // 0 a 100
  rationale: {
    industrySpecialization: boolean;
    currentWorkloadCapacity: 'LOW' | 'OPTIMAL' | 'OVERLOADED';
    historicalConversionRate: number;
    territoryCompliance: boolean;
  };
  estimatedConversionUpliftPercent: number;
  approvalStatus: 'PENDING_HUMAN_REVIEW' | 'APPROVED' | 'REJECTED';
  generatedAt: string;
}

export interface ExecutiveRevenueCockpit {
  organizationId: string;
  currentPeriod: string;
  currentQuota: number;
  closedWonRevenue: number;
  quotaAttainmentPercent: number;
  weightedPipelineRevenue: number;
  projections: {
    days30: ProjectedRevenueHorizon;
    days90: ProjectedRevenueHorizon;
    days180: ProjectedRevenueHorizon;
  };
  dealsAtRisk: Array<{
    dealId: string;
    dealTitle: string;
    amount: number;
    currentStage: string;
    riskScore: number;
    primaryRiskReason: string;
  }>;
  mainFunnelBottlenecks: Array<{
    stageName: string;
    conversionDropPercent: number;
    avgDaysInStage: number;
  }>;
  activeRecommendationsCount: number;
  modelConfidence: 'CALIBRATED_PROJECTION' | 'ESTIMATED_ONLY';
  lastCalculatedAt: string;
}

export interface IPredictiveRevenueOraclePort {
  getCockpitData(organizationId: string): Promise<ExecutiveRevenueCockpit>;
  runWhatIfSimulation(input: WhatIfSimulationInput): Promise<WhatIfSimulationResult>;
  getBacktestMetrics(organizationId: string): Promise<BacktestValidationMetrics>;
  generateAccountAllocationRecommendations(params: {
    organizationId: string;
    limit?: number;
  }): Promise<AccountAllocationRecommendation[]>;
  approveAccountAllocation(params: {
    organizationId: string;
    recommendationId: string;
    approvedBy: string;
  }): Promise<{ success: boolean; executedAllocation: AccountAllocationRecommendation }>;
}
