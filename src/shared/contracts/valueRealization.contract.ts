/**
 * Contrato Canônico do Value Realization Engine — Birth Hub 360°
 * Onda 03: Autonomia Comercial Inteligente
 * Dono: Agente 18 — Contratos e API
 */

export type ValueMetricType =
  | 'operational_time_reduction'
  | 'productivity_gain'
  | 'rework_reduction'
  | 'conversion_increase'
  | 'cost_reduction'
  | 'response_time_improvement';

export type ValueRealizationStatus =
  | 'PROMISED'
  | 'APPROVED'
  | 'ONBOARDING_ACTIVE'
  | 'MEASURED_ON_TRACK'
  | 'MEASURED_GAP'
  | 'ACHIEVED';

export interface ValueObservationHistoryEntry {
  timestamp: string; // ISO 8601
  observedValue: number;
  measuredBy: string;
  evidenceSnippet: string;
  divergencePercent?: number;
}

export interface ValueRealizationTracker {
  id: string;
  organizationId: string;
  customerCompanyName: string;
  dealId?: string;
  promiseCommitmentId?: string;
  metricType: ValueMetricType;
  indicatorName: string;
  baselineValue: number;
  targetValue: number;
  observedValue?: number;
  unit: string; // ex: "%", "horas/mês", "R$", "minutos"
  deadline: string; // ISO 8601
  responsibleOwnerName: string;
  status: ValueRealizationStatus;
  fulfillmentEvidence?: string;
  divergenceNotes?: string;
  history: ValueObservationHistoryEntry[];
  createdAt: string;
  lastEvaluatedAt?: string;
}

export interface ValueRealizationSummary {
  organizationId: string;
  totalTrackers: number;
  achievedCount: number;
  onTrackCount: number;
  gapCount: number;
  pendingValidationCount: number;
  averageAchievementRatePercent: number;
  calculatedAt: string;
}

export interface IValueRealizationPort {
  createTrackerFromPromise(params: {
    organizationId: string;
    commitmentId: string;
    customerCompanyName: string;
    dealId?: string;
    metricType: ValueMetricType;
    indicatorName: string;
    baselineValue: number;
    targetValue: number;
    unit: string;
    deadline: string;
    responsibleOwnerName: string;
  }): Promise<ValueRealizationTracker>;

  recordObservedValue(params: {
    organizationId: string;
    trackerId: string;
    observedValue: number;
    evidence: string;
    measuredBy: string;
  }): Promise<ValueRealizationTracker>;

  listTrackers(
    organizationId: string,
    filters?: { customerCompanyName?: string; status?: ValueRealizationStatus },
  ): Promise<ValueRealizationTracker[]>;

  getRealizationSummary(organizationId: string): Promise<ValueRealizationSummary>;
}
