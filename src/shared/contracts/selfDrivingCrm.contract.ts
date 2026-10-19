/**
 * Contrato Canônico do Self-Driving CRM — Birth Hub 360°
 * Onda 03: Autonomia Comercial Inteligente
 * Dono: Agente 18 — Contratos e API
 */

export type EngagementChannel = 'voice_call' | 'email' | 'whatsapp' | 'social_selling' | 'meeting';

export type EngagementSignalType =
  | 'CALL_ANSWERED'
  | 'CALL_UNANSWERED'
  | 'EMAIL_REPLIED'
  | 'EMAIL_OPENED'
  | 'WHATSAPP_REPLIED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_HELD'
  | 'STAGE_ADVANCED'
  | 'REVOPS_ENGAGEMENT_SPIKE';

export interface EngagementSignal {
  id: string;
  organizationId: string;
  leadId: string;
  dealId?: string;
  channel: EngagementChannel;
  signalType: EngagementSignalType;
  timestamp: string; // ISO 8601
  verified: boolean;
  confidence: number; // 0 to 1
  metadata?: Record<string, unknown>;
}

export type AutonomyLevel = 'ASSIST' | 'DRAFT' | 'CONTROLLED_AUTO';

export type CadenceOptimizationAction =
  | 'reduce_calls_shift_whatsapp'
  | 'switch_to_email_consultative'
  | 'accelerate_touchpoints'
  | 'pause_cadence'
  | 'shift_to_voice_followup';

export interface CadenceRecommendation {
  id: string;
  organizationId: string;
  leadId: string;
  dealId?: string;
  recommendedAction: CadenceOptimizationAction;
  prioritizedChannel: EngagementChannel;
  suggestedContactWindow: string; // Ex: "14:00 - 17:00 (Ter-Qui)"
  rationale: string;
  autonomyLevel: AutonomyLevel;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  proposedTouchAdjustments: Array<{
    order: number;
    channel: EngagementChannel;
    delayHoursFromPrevious: number;
  }>;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export type ReactivationStrategy =
  | 'consultative_breakup_email'
  | 'invite_industry_event'
  | 'share_relevant_case_study'
  | 'multi_decision_maker_approach'
  | 'diagnostic_refresh'
  | 'executive_sponsor_touch';

export interface StagnantLeadAnalysis {
  leadId: string;
  leadName: string;
  organizationId: string;
  daysInactive: number;
  currentStage: string;
  isOptedOut: boolean;
  hasActiveNegotiation: boolean;
  eligibleForReactivation: boolean;
  ineligibilityReason?: string;
  recommendedStrategy?: ReactivationStrategy;
  suggestedCopySubject?: string;
  suggestedBodySnippet?: string;
  confidence: number;
  analyzedAt: string;
}

export interface ISelfDrivingCrmPort {
  registerEngagementSignal(signal: {
    organizationId: string;
    leadId: string;
    dealId?: string;
    channel: EngagementChannel;
    signalType: EngagementSignalType;
    verified?: boolean;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): Promise<EngagementSignal>;

  evaluateCadenceOptimization(params: {
    organizationId: string;
    leadId: string;
    recentSignals?: EngagementSignal[];
  }): Promise<CadenceRecommendation | null>;

  detectStagnatedLeads(params: {
    organizationId: string;
    inactivityThresholdDays?: number;
    limit?: number;
  }): Promise<StagnantLeadAnalysis[]>;

  approveCadenceRecommendation(params: {
    organizationId: string;
    recommendationId: string;
    approvedBy: string;
  }): Promise<{
    success: boolean;
    recommendation: CadenceRecommendation;
    executionLog: string;
  }>;
}
