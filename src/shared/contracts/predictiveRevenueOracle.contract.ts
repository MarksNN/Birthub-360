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

/**
 * @deprecated Contrato legado da UI estática (PredictiveRevenueCockpit.tsx, dono 02). O backend
 * (REMED-03) responde com os tipos `*V2` abaixo; a UI deve migrar para eles.
 */
export interface IPredictiveRevenueOraclePortLegacy {
  getCockpitData(organizationId: string): Promise<ExecutiveRevenueCockpit>;
  runWhatIfSimulation(input: WhatIfSimulationInput): Promise<WhatIfSimulationResult>;
  getBacktestMetrics(organizationId: string): Promise<BacktestValidationMetrics>;
}

// ---------------------------------------------------------------------------------------------
// REMED-03 (auditoria forense @281cfcd3) — contrato HONESTO do Revenue Oracle.
// Todo número é derivado do histórico real do tenant. Sem histórico suficiente:
// `status: 'insufficient_data'`, valores `null` e `insufficientDataReason` — nunca número inventado.
// ---------------------------------------------------------------------------------------------
export type OracleDataStatus = 'ok' | 'insufficient_data';

export interface ProjectedRevenueHorizonV2 {
  horizonDays: RevenueHorizonDays;
  status: OracleDataStatus;
  insufficientDataReason: string | null;
  /** Quantas janelas históricas de `horizonDays` alimentaram o intervalo. */
  sampleWindows: number;
  expectedRevenue: number | null;
  confidenceInterval: { p10: number; p50: number; p90: number } | null;
  pipelineWeightedAmount: number;
  projectedWonDealsCount: number | null;
  keyDrivers: string[];
  uncertaintyDegree: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

export interface WhatIfSimulationResultV2 {
  simulationId: string;
  organizationId: string;
  name: string;
  status: OracleDataStatus;
  insufficientDataReason: string | null;
  baselineRevenue: number | null;
  simulatedRevenue: number | null;
  netRevenueDelta: number | null;
  deltaPercent: number | null;
  impactBreakdown: WhatIfSimulationResult['impactBreakdown'] | null;
  simulatedAt: string;
}

export interface BacktestValidationMetricsV2 {
  evaluationPeriod: string;
  samplesEvaluated: number;
  meanAbsoluteError: number | null;
  meanAbsolutePercentageError: number | null;
  predictionBias: number | null;
  calibrationScore: number | null;
  /** null: snapshots persistidos não guardam P10/P90 — cobertura não mensurável. */
  predictionIntervalCoveragePercent: number | null;
  isModelCalibrated: boolean;
  status: 'CALIBRATED' | 'UNCALIBRATED_ESTIMATE_ONLY' | 'INSUFFICIENT_DATA';
  insufficientDataReason: string | null;
}

export interface ExecutiveRevenueCockpitV2 {
  organizationId: string;
  /** "YYYY-MM" (UTC). */
  currentPeriod: string;
  status: OracleDataStatus;
  insufficientDataReason: string | null;
  /** null: meta vive em CommercialGoal — ler GET /api/commercial-intelligence/goals. */
  currentQuota: number | null;
  closedWonRevenue: number;
  quotaAttainmentPercent: number | null;
  weightedPipelineRevenue: number;
  projections: {
    days30: ProjectedRevenueHorizonV2;
    days90: ProjectedRevenueHorizonV2;
    days180: ProjectedRevenueHorizonV2;
  };
  /** Sempre []: risco/gargalo reais vivem em /deals e /funnel-bottlenecks. */
  dealsAtRisk: ExecutiveRevenueCockpit['dealsAtRisk'];
  mainFunnelBottlenecks: ExecutiveRevenueCockpit['mainFunnelBottlenecks'];
  activeRecommendationsCount: number;
  modelConfidence: 'CALIBRATED_PROJECTION' | 'ESTIMATED_ONLY' | 'INSUFFICIENT_DATA';
  lastCalculatedAt: string;
}

export interface IPredictiveRevenueOraclePort {
  getCockpitData(organizationId: string): Promise<ExecutiveRevenueCockpitV2>;
  runWhatIfSimulation(input: WhatIfSimulationInput): Promise<WhatIfSimulationResultV2>;
  getBacktestMetrics(organizationId: string): Promise<BacktestValidationMetricsV2>;
  generateAccountAllocationRecommendations(params: {
    organizationId: string;
    limit?: number;
  }): Promise<AccountAllocationRecommendation[]>;
}

// ---------------------------------------------------------------------------------------------
// REMED-04 — aprovação humana de rebalanceamento de carteira (persistida + auditada).
// POST /api/commercial-intelligence/predictive/rebalance/approvals
// ---------------------------------------------------------------------------------------------
export interface RebalanceApprovalRequest {
  /** Id estável da proposta (chave de idempotência). */
  recommendationId: string;
  /** Lead/negócio (funil Negócio) cuja carteira muda — precisa existir no tenant. */
  leadId: string;
  fromOwner: string | null;
  toOwner: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}

export interface RebalanceApprovalRecord extends RebalanceApprovalRequest {
  approvalId: string;
  organizationId: string;
  decidedBy: string;
  decidedAt: string;
  /** Aprovação registra a decisão; a troca de responsável segue pelo fluxo normal do CRM. */
  appliedToCrm: false;
}

export interface RebalanceApprovalResponse {
  approval: RebalanceApprovalRecord;
  /** true quando a mesma decisão já existia (replay idempotente — nada novo foi gravado). */
  alreadyRecorded: boolean;
}
