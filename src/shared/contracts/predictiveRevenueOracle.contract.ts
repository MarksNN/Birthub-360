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

// ---------------------------------------------------------------------------------------------
// Recomendações de rebalanceamento V2 (Agente 04) — calculadas a partir de dados REAIS do tenant.
// GET /api/commercial-intelligence/predictive/rebalance/recommendations
// Ids de owner = `Lead.owner` resolvido para `User.id` do mesmo tenant; o POST /rebalance/approvals
// aceita exatamente `recommendationId`, `leadId`, `fromOwner.id`, `toOwner.id` daqui.
// ---------------------------------------------------------------------------------------------
export type RebalanceRecommendationStatusV2 = 'PENDING_HUMAN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface RebalanceOwnerStatsV2 {
  /** `User.id` (igual ao valor gravado em `Lead.owner`). */
  id: string;
  name: string;
  openDeals: number;
  /** Negócios encerrados (ganhos + perdidos) na janela de throughput. */
  closedInWindow: number;
  /** openDeals ÷ (closedInWindow ÷ janelaDias): dias para escoar a carteira no ritmo histórico. */
  backlogDays: number;
}

export interface RebalanceRecommendationV2 {
  /** Determinístico: hash(tenant, leadId, fromOwner, toOwner). Chave de idempotência do POST. */
  recommendationId: string;
  leadId: string;
  leadTitle: string | null;
  account: { companyId: string | null; name: string | null };
  amount: number | null;
  fromOwner: { id: string; name: string };
  toOwner: { id: string; name: string };
  reason: string;
  evidence: {
    from: RebalanceOwnerStatsV2;
    to: RebalanceOwnerStatsV2;
    teamMedianBacklogDays: number;
    dealOpenSinceDays: number;
  };
  approvalStatus: RebalanceRecommendationStatusV2;
  /** Decisão já registrada via POST /rebalance/approvals (AuditLog) ou null. */
  decision: RebalanceApprovalRecord | null;
}

export interface RebalanceRecommendationsResponseV2 {
  status: OracleDataStatus;
  insufficientDataReason: string | null;
  generatedAt: string;
  rule: {
    description: string;
    throughputWindowDays: number;
    minOwners: number;
    minClosedPerOwner: number;
    overloadRatio: number;
    minOpenDealsToDonate: number;
    maxMovesPerOwner: number;
  };
  teamMedianBacklogDays: number | null;
  owners: RebalanceOwnerStatsV2[];
  diagnostics: {
    openDealsTotal: number;
    unassignedOpenDeals: number;
    /** `Lead.owner` preenchido mas que não corresponde a um `User.id` do tenant (ex.: nome livre). */
    unresolvedOwnerOpenDeals: number;
  };
  recommendations: RebalanceRecommendationV2[];
}

// ---------------------------------------------------------------------------------------------
// What-If V2 (Agente 04) — POST /api/commercial-intelligence/predictive/what-if
// Identidade receita = volume × winRate × ticket; sem multiplicadores/elasticidades ocultos.
// ---------------------------------------------------------------------------------------------
export interface WhatIfLeversV2 {
  /** Variação % no volume de negócios encerrados (ganhos+perdidos). -100..500. */
  pipelineVolumeDeltaPercent: number;
  /** Variação em PONTOS PERCENTUAIS na taxa de ganho. -100..100. */
  winRateDeltaPp: number;
  /** Variação % no ticket médio dos ganhos. -100..500. */
  avgTicketDeltaPercent: number;
}

export interface WhatIfRequestV2 {
  horizonDays: RevenueHorizonDays;
  name?: string;
  levers: Partial<WhatIfLeversV2>;
}

export interface WhatIfBaselineV2 {
  /** P50 do Oracle para o horizonte (receita ganha real em janelas móveis). */
  revenue: number;
  closedDeals: number;
  wonDeals: number;
  /** wonDeals ÷ closedDeals (0..1) no lookback. */
  winRate: number;
  /** Receita ganha ÷ wonDeals no lookback. */
  avgTicket: number;
  lookbackMonths: number;
  sampleWindows: number;
}

export interface WhatIfResultV2 {
  status: OracleDataStatus;
  insufficientDataReason: string | null;
  name: string | null;
  horizonDays: RevenueHorizonDays;
  levers: WhatIfLeversV2;
  baseline: WhatIfBaselineV2 | null;
  result: {
    simulatedRevenue: number;
    netRevenueDelta: number;
    deltaPercent: number;
    factors: { volume: number; winRate: number; ticket: number };
    simulatedWinRate: number;
    simulatedAvgTicket: number;
    /** Decomposição sequencial (volume → winRate → ticket); soma = netRevenueDelta. */
    breakdown: { volumeImpact: number; winRateImpact: number; ticketImpact: number };
  } | null;
  formula: string;
  assumptions: string[];
  simulatedAt: string;
}
