/**
 * Contrato Canônico para Análise Forense de Win-Loss (Win-Loss Deep Autopsy).
 * Onda 02 — Eixo 19
 * Dono: Agente 18 — Contratos e API
 */

export type WinLossOutcome = 'DEAL_WON' | 'DEAL_LOST';

export interface AutopsyTimelineEvent {
  timestamp: string;
  stageName: string;
  activityType: string;
  description: string;
  actor: string;
}

export interface AutopsyFactorHypothesis {
  factor: string;
  category:
    | 'pricing'
    | 'product_fit'
    | 'competitor'
    | 'timing'
    | 'stakeholder_alignment'
    | 'sales_execution';
  contributionType: 'primary_hypothesis' | 'contributing_factor' | 'minor_signal';
  confidenceScore: number; // 0 a 1 (nunca afirmado como causa absoluta única)
  evidenceRefs: string[];
}

export interface CuratedLearningCandidate {
  title: string;
  objectionPattern?: string;
  winningStrategyPattern?: string;
  recommendedCounterMeasure?: string;
  curationStatus: 'proposed' | 'approved_for_playbook' | 'rejected';
  targetAudience: 'sdr' | 'closer' | 'revops';
}

export interface WinLossAutopsyReport {
  id: string;
  dealId: string;
  dealTitle: string;
  companyName: string;
  organizationId: string;
  outcome: WinLossOutcome;
  dealValue: number;
  salesCycleDays: number;
  closedAt: string;
  analyzedAt: string;

  // As 9 Seções Obrigatórias da Autópsia Forense:
  sectionA_Timeline: AutopsyTimelineEvent[];
  sectionB_PositiveSignals: string[];
  sectionC_NegativeSignalsAndObjections: string[];
  sectionD_FactorHypotheses: AutopsyFactorHypothesis[];
  sectionE_AuditableEvidences: Array<{ source: string; snippet: string; date: string }>;
  sectionF_InformationGaps: string[];
  sectionG_ProcessRecommendations: string[];
  sectionH_CuratedLearningCandidates: CuratedLearningCandidate[];
  sectionI_ActionPlan: {
    playbookActions: string[];
    roleplayScenarios: string[];
    revOpsAdjustments: string[];
  };
  sectionI_ActionItems?: Array<{ type: string; title: string; target: string }>;

  humanReviewStatus: 'pending' | 'verified_by_manager' | 'disputed';
  reviewerNotes?: string;
}

export interface IWinLossAutopsyPort {
  generateAutopsy(params: {
    organizationId: string;
    dealId: string;
    outcome: WinLossOutcome;
    dealTitle: string;
    companyName: string;
    dealValue: number;
    timelineEvents: AutopsyTimelineEvent[];
    messagesAndNotes: Array<{ role: string; content: string; date: string }>;
    unresolvedObjections?: string[];
    competitorsMentioned?: string[];
  }): Promise<WinLossAutopsyReport>;

  performAutopsy?(params: any): Promise<WinLossAutopsyReport>;

  promoteLearningToPlaybook(params: {
    organizationId: string;
    reportId: string;
    candidateIndex: number;
    reviewedBy: string;
  }): Promise<{ promoted: boolean; playbookEntryId?: string }>;
}
