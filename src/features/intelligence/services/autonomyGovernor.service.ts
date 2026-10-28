import { randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  AgentActionEvaluation,
  AgentSloMetrics,
  AutonomyLevel,
  AutonomyPolicyConfig,
  IAutonomyGovernorPort,
} from '../../../shared/contracts/autonomyLimits.contract.js';

export class AutonomyGovernorService implements IAutonomyGovernorPort {
  private policiesStore = new Map<string, AutonomyPolicyConfig>();
  private evaluationsStore = new Map<string, AgentActionEvaluation[]>();

  constructor() {
    // Política padrão segura por tenant (L2_CONDITIONAL: alçada de R$ 50.000,00)
    const defaultPolicy: AutonomyPolicyConfig = {
      organizationId: 'default',
      globalLevel: 'L2_CONDITIONAL',
      maxDailyOutboundCallsPerAgent: 100,
      maxHourlyMessagesPerLead: 3,
      financialAlcadaLimitCents: 5000000, // R$ 50.000,00
      requireApprovalForExternalDispatches: true,
      activeGuardrails: ['pii_masking', 'commercial_alcada', 'tone_compliance'],
    };
    this.policiesStore.set('default', defaultPolicy);
  }

  /**
   * Avalia uma ação pretendida por um agente de IA contra a política de autonomia do tenant.
   */
  async evaluateAction(params: {
    organizationId: string;
    agentRole: string;
    actionType: string;
    actionPayload: Record<string, unknown>;
    estimatedValueCents?: number;
  }): Promise<AgentActionEvaluation> {
    if (!params.organizationId || params.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório para avaliação de autonomia');
    }

    const policy = this.policiesStore.get(params.organizationId) || {
      ...this.policiesStore.get('default')!,
      organizationId: params.organizationId,
    };

    const actionId = `eval-${randomUUID()}`;
    const evaluatedAt = new Date().toISOString();
    let isAllowedAutonomously = false;
    let requiresHumanReview = true;
    let reason = 'Ação retida para aprovação humana preventiva.';

    switch (policy.globalLevel) {
      case 'L0_MANUAL':
        isAllowedAutonomously = false;
        requiresHumanReview = true;
        reason = 'Organização opera em Nível L0 (Manual Total). Nenhuma ação autônoma permitida.';
        break;

      case 'L1_ASSISTED':
        isAllowedAutonomously = false;
        requiresHumanReview = true;
        reason =
          'Organização opera em Nível L1 (Assistido). Toda ação externa requer aceite de operador.';
        break;

      case 'L2_CONDITIONAL':
      case 'L3_HIGH_AUTONOMY': {
        const valueCents = params.estimatedValueCents ?? 0;
        if (valueCents > policy.financialAlcadaLimitCents) {
          isAllowedAutonomously = false;
          requiresHumanReview = true;
          reason = `Valor estimado (R$ ${(valueCents / 100).toFixed(2)}) ultrapassa a alçada autônoma do tenant (R$ ${(policy.financialAlcadaLimitCents / 100).toFixed(2)}).`;

          await domainEventMesh.publish({
            eventType: 'AUTONOMY_LIMIT_EXCEEDED',
            eventVersion: '1.0.0',
            organizationId: params.organizationId,
            correlationId: `alcada-${actionId}`,
            producer: 'autonomy-governor-engine',
            aggregateId: params.agentRole,
            payload: {
              actionId,
              agentRole: params.agentRole,
              actionType: params.actionType,
              estimatedValueCents: valueCents,
              limitCents: policy.financialAlcadaLimitCents,
            },
          });
        } else if (
          policy.requireApprovalForExternalDispatches &&
          (params.actionType === 'send_contract' || params.actionType === 'delete_lead')
        ) {
          isAllowedAutonomously = false;
          requiresHumanReview = true;
          reason = `Ação do tipo "${params.actionType}" é classificada como de alto impacto e exige aprovação humana.`;
        } else {
          isAllowedAutonomously = true;
          requiresHumanReview = false;
          reason = `Ação aprovada para execução autônoma dentro dos limites de alçada do Nível ${policy.globalLevel}.`;
        }
        break;
      }

      case 'L4_FULL_AUTONOMY':
        isAllowedAutonomously = true;
        requiresHumanReview = false;
        reason =
          'Organização em Nível L4 (Autonomia Total supervisionada por auditoria posterior).';
        break;
    }

    const evaluation: AgentActionEvaluation = {
      actionId,
      organizationId: params.organizationId,
      agentRole: params.agentRole,
      actionType: params.actionType,
      estimatedValueCents: params.estimatedValueCents,
      isAllowedAutonomously,
      requiresHumanReview,
      reason,
      evaluatedAt,
    };

    const evals = this.evaluationsStore.get(params.organizationId) || [];
    evals.push(evaluation);
    this.evaluationsStore.set(params.organizationId, evals);

    logger.info(
      `[AutonomyGovernor] Ação ${params.actionType} (${params.agentRole}) no tenant ${params.organizationId}: Autônoma=${isAllowedAutonomously}, Humano=${requiresHumanReview}.`,
    );

    return evaluation;
  }

  /**
   * Retorna métricas consolidadas de SLO dos agentes no tenant.
   */
  async getSloMetrics(
    organizationId: string,
    window: 'last_hour' | 'last_24h' | 'last_7d',
  ): Promise<AgentSloMetrics> {
    const evals = this.evaluationsStore.get(organizationId) || [];
    const total = evals.length;
    const humanInterventions = evals.filter((e) => e.requiresHumanReview).length;
    const autonomous = total - humanInterventions;
    const interventionRate = total > 0 ? Math.round((humanInterventions / total) * 100) : 0;

    const isSloBreached = interventionRate > 80 && total >= 5;
    const activeAlerts: string[] = [];

    if (isSloBreached) {
      activeAlerts.push(
        `Taxa de intervenção humana elevada (${interventionRate}%). Verifique os limites de alçada.`,
      );
    }

    return {
      organizationId,
      windowPeriod: window,
      totalAutonomousActions: autonomous,
      humanInterventionsCount: humanInterventions,
      humanInterventionRatePercent: interventionRate,
      guardrailTriggersCount: humanInterventions,
      averageResponseLatencyMs: 240,
      errorRatePercent: 0,
      isSloBreached,
      activeAlerts,
    };
  }

  /**
   * Atualiza as políticas de autonomia de um tenant.
   */
  async updatePolicy(config: AutonomyPolicyConfig): Promise<AutonomyPolicyConfig> {
    if (!config.organizationId) {
      throw new Error('Tenancy violation: organizationId obrigatório para política');
    }
    this.policiesStore.set(config.organizationId, config);
    logger.info(
      `[AutonomyGovernor] Política de autonomia atualizada para tenant ${config.organizationId} (Nível: ${config.globalLevel}).`,
    );
    return config;
  }

  clear(): void {
    this.policiesStore.clear();
    this.evaluationsStore.clear();
  }
}

export const autonomyGovernorService = new AutonomyGovernorService();
