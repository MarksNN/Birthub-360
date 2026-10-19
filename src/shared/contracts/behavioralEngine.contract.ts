/**
 * Contrato Canônico do Behavioral Engine — Birth Hub 360°
 * Onda 03: Autonomia Comercial Inteligente
 * Dono: Agente 18 — Contratos e API
 */

export type CommercialBottleneckMetric =
  | 'cold_call_conversion'
  | 'price_objection_handling'
  | 'opportunity_qualification'
  | 'response_time_sla'
  | 'meeting_conversion'
  | 'lead_recovery'
  | 'multi_decision_maker_deals';

export type BottleneckSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CommercialBottleneck {
  id: string;
  organizationId: string;
  sellerId: string;
  sellerName: string;
  metric: CommercialBottleneckMetric;
  severity: BottleneckSeverity;
  observedValue: number;
  benchmarkValue: number;
  sampleSize: number;
  detectedAt: string;
  confidence: number; // 0 to 1
  context: string;
}

export type MissionStatus =
  | 'SUGGESTED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface MissionVerifiableCriteria {
  criterionType:
    | 'roleplay_score'
    | 'activity_count'
    | 'qualification_count'
    | 'conversion_threshold';
  targetCount: number;
  minScore?: number;
  timeframeDays: number;
}

export interface MissionReward {
  xp: number;
  badgeId?: string;
  skillProgression?: {
    skillName: string;
    deltaPercent: number;
  };
}

export interface CommercialMission {
  id: string;
  organizationId: string;
  sellerId: string;
  sellerName: string;
  bottleneckId: string;
  title: string;
  objective: string;
  verifiableCriteria: MissionVerifiableCriteria;
  deadline: string; // ISO 8601
  status: MissionStatus;
  reward: MissionReward;
  evidenceSnippet?: string;
  completedAt?: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface AdaptiveCoachingPlan {
  organizationId: string;
  sellerId: string;
  sellerName: string;
  headline: string;
  suggestedRoleplay: {
    personaId: string;
    personaName: string;
    focusObjection: string;
    targetScore: number;
  };
  objectionMatrixTopic: string;
  playbookModule: string;
  microTrainingAction: string;
  createdAt: string;
}

export interface IBehavioralEnginePort {
  detectBottlenecks(params: {
    organizationId: string;
    sellerId: string;
    sellerName: string;
    performanceMetrics: {
      callsCount: number;
      meetingsCount: number;
      qualifiedCount: number;
      dealsClosed: number;
      wonRevenue: number;
      conversionRatePercent: number;
      avgResponseTimeHours?: number;
      topLossReason?: string;
      roleplayAverageScore?: number;
    };
  }): Promise<CommercialBottleneck[]>;

  generateAdaptiveMission(params: {
    organizationId: string;
    bottleneck: CommercialBottleneck;
  }): Promise<CommercialMission>;

  acceptMission(
    organizationId: string,
    missionId: string,
    sellerId: string,
  ): Promise<CommercialMission>;

  claimMissionReward(params: {
    organizationId: string;
    missionId: string;
    sellerId: string;
    evidence: {
      completedCount: number;
      averageScore?: number;
      evidenceHash: string;
      verifierSource: 'roleplay_engine' | 'crm_activity' | 'deal_pipeline';
    };
  }): Promise<{
    success: boolean;
    awardedXp: number;
    newTotalXp: number;
    newLevel: number;
    levelTitle: string;
    badgeUnlocked?: string;
    mission: CommercialMission;
  }>;

  getAdaptiveCoachingPlan(params: {
    organizationId: string;
    sellerId: string;
    sellerName: string;
    bottlenecks: CommercialBottleneck[];
  }): Promise<AdaptiveCoachingPlan>;
}
