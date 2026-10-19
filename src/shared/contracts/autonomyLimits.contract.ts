/**
 * Contrato canônico para o subsistema de Níveis de Autonomia, Trava de Limites e SLO de Agentes.
 * Onda 03 — Evolução 12
 */

export type AutonomyLevel =
  | 'L0_MANUAL' // Apenas sugestões, nenhuma ação executada
  | 'L1_ASSISTED' // Rascunhos gerados, aprovação humana obrigatória para cada ação
  | 'L2_CONDITIONAL' // Ações de baixo risco autônomas, ações críticas com aprovação
  | 'L3_HIGH_AUTONOMY' // Ações de rotina autônomas dentro de alçadas pré-definidas
  | 'L4_FULL_AUTONOMY'; // Autonomia supervisionada por exceção e auditoria posterior

export interface AutonomyPolicyConfig {
  organizationId: string;
  globalLevel: AutonomyLevel;
  maxDailyOutboundCallsPerAgent: number;
  maxHourlyMessagesPerLead: number;
  financialAlcadaLimitCents: number; // Acima deste valor, exige aprovação humana
  requireApprovalForExternalDispatches: boolean;
  activeGuardrails: string[];
}

export interface AgentActionEvaluation {
  actionId: string;
  organizationId: string;
  agentRole: string;
  actionType: string;
  estimatedValueCents?: number;
  isAllowedAutonomously: boolean;
  requiresHumanReview: boolean;
  reason: string;
  evaluatedAt: string;
}

export interface AgentSloMetrics {
  organizationId: string;
  windowPeriod: 'last_hour' | 'last_24h' | 'last_7d';
  totalAutonomousActions: number;
  humanInterventionsCount: number;
  humanInterventionRatePercent: number;
  guardrailTriggersCount: number;
  averageResponseLatencyMs: number;
  errorRatePercent: number;
  isSloBreached: boolean;
  activeAlerts: string[];
}

export interface IAutonomyGovernorPort {
  evaluateAction(params: {
    organizationId: string;
    agentRole: string;
    actionType: string;
    actionPayload: Record<string, unknown>;
    estimatedValueCents?: number;
  }): Promise<AgentActionEvaluation>;
  getSloMetrics(
    organizationId: string,
    window: 'last_hour' | 'last_24h' | 'last_7d',
  ): Promise<AgentSloMetrics>;
  updatePolicy(config: AutonomyPolicyConfig): Promise<AutonomyPolicyConfig>;
}
