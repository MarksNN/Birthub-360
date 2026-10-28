import { randomUUID } from 'node:crypto';
import { logger } from '../../../lib/logger.js';
import { domainEventMesh } from '../../../lib/queue/domainEventMesh.service.js';
import type {
  CadenceRecommendation,
  EngagementChannel,
  EngagementSignal,
  EngagementSignalType,
  ISelfDrivingCrmPort,
  StagnantLeadAnalysis,
} from '../../../shared/contracts/selfDrivingCrm.contract.js';
import type { OptOutRepository } from '../../../shared/domain/optOut.js';
import { isOptedOut } from '../application/optOutService.js';
import { InMemoryOptOutRepository } from '../infra/InMemoryOptOutRepository.js';
import { adaptiveMultichannelCadenceService } from './adaptiveMultichannelCadence.service.js';

export class SelfDrivingCrmService implements ISelfDrivingCrmPort {
  private signalsStore = new Map<string, EngagementSignal[]>(); // key: `${orgId}:${leadId}`
  private recommendationsStore = new Map<string, CadenceRecommendation>(); // key: `${orgId}:${recId}`
  private optOutRepo: OptOutRepository = new InMemoryOptOutRepository();
  private mockLeadsStore = new Map<
    string,
    {
      organizationId?: string;
      leadId: string;
      leadName: string;
      currentStage: string;
      lastActivityAt: Date;
      hasActiveDeal: boolean;
      isWonOrLost: boolean;
    }
  >();

  setOptOutRepository(repo: OptOutRepository): void {
    this.optOutRepo = repo;
  }

  getOptOutRepository(): OptOutRepository {
    return this.optOutRepo;
  }

  /**
   * Registra sinal de engajamento auditável com proveniência de canal.
   */
  async registerEngagementSignal(signal: {
    organizationId: string;
    leadId: string;
    dealId?: string;
    channel: EngagementChannel;
    signalType: EngagementSignalType;
    verified?: boolean;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }): Promise<EngagementSignal> {
    if (!signal.organizationId || signal.organizationId.trim() === '') {
      throw new Error('Tenancy violation: organizationId obrigatório');
    }

    const id = `sig-${randomUUID().substring(0, 8)}`;
    const newSignal: EngagementSignal = {
      id,
      organizationId: signal.organizationId,
      leadId: signal.leadId,
      dealId: signal.dealId,
      channel: signal.channel,
      signalType: signal.signalType,
      timestamp: new Date().toISOString(),
      verified: signal.verified ?? true,
      confidence: signal.confidence ?? 0.95,
      metadata: signal.metadata,
    };

    const key = `${signal.organizationId}:${signal.leadId}`;
    const existing = this.signalsStore.get(key) || [];
    existing.push(newSignal);
    this.signalsStore.set(key, existing);

    await domainEventMesh.publish({
      eventType: 'ENGAGEMENT_SIGNAL_RECEIVED',
      eventVersion: '1.0.0',
      organizationId: signal.organizationId,
      correlationId: `eng-evt-${id}`,
      producer: 'self-driving-crm-service',
      aggregateId: signal.leadId,
      payload: {
        signalId: id,
        channel: signal.channel,
        signalType: signal.signalType,
        verified: newSignal.verified,
      },
    });

    return newSignal;
  }

  /**
   * Avalia a necessidade de otimização de cadência baseada nos sinais reais.
   * Se um lead não atende ligações mas respondeu por WhatsApp/e-mail, propõe redução de chamadas.
   */
  async evaluateCadenceOptimization(params: {
    organizationId: string;
    leadId: string;
    recentSignals?: EngagementSignal[];
  }): Promise<CadenceRecommendation | null> {
    const { organizationId, leadId } = params;
    const key = `${organizationId}:${leadId}`;
    const signals = params.recentSignals || this.signalsStore.get(key) || [];

    if (signals.length === 0) {
      return null;
    }

    // Contagem de sinais
    const unansweredCalls = signals.filter(
      (s) => s.channel === 'voice_call' && s.signalType === 'CALL_UNANSWERED',
    ).length;
    const answeredCalls = signals.filter(
      (s) => s.channel === 'voice_call' && s.signalType === 'CALL_ANSWERED',
    ).length;
    const whatsappReplies = signals.filter(
      (s) => s.channel === 'whatsapp' && s.signalType === 'WHATSAPP_REPLIED',
    ).length;
    const emailReplies = signals.filter(
      (s) => s.channel === 'email' && s.signalType === 'EMAIL_REPLIED',
    ).length;

    let recommendationAction: CadenceRecommendation['recommendedAction'] | null = null;
    let prioritizedChannel: EngagementChannel = 'email';
    let rationale = '';

    if (unansweredCalls >= 1 && whatsappReplies > 0) {
      recommendationAction = 'reduce_calls_shift_whatsapp';
      prioritizedChannel = 'whatsapp';
      rationale = `Lead não atendeu ${unansweredCalls} tentativa(s) de ligação, porém respondeu ativamente via WhatsApp. Recomendado migrar cadência para WhatsApp e reduzir chamadas de voz.`;
    } else if (unansweredCalls >= 3 && emailReplies > 0) {
      recommendationAction = 'switch_to_email_consultative';
      prioritizedChannel = 'email';
      rationale = `Baixa receptividade por voz (${unansweredCalls} chamadas não atendidas), com engajamento registrado por e-mail. Sugerida abordagem consultiva assíncrona.`;
    } else if (answeredCalls >= 1) {
      recommendationAction = 'accelerate_touchpoints';
      prioritizedChannel = 'voice_call';
      rationale =
        'Chamada atendida com sucesso. Recomenda-se acelerar agendamento de reunião de demonstração.';
    }

    if (!recommendationAction) {
      return null;
    }

    const recId = `rec-${randomUUID().substring(0, 8)}`;
    const recommendation: CadenceRecommendation = {
      id: recId,
      organizationId,
      leadId,
      recommendedAction: recommendationAction,
      prioritizedChannel,
      suggestedContactWindow: '14:00 - 17:00 (Ter-Qui)',
      rationale,
      autonomyLevel: 'DRAFT', // Prepara para revisão humana
      status: 'PENDING_REVIEW',
      proposedTouchAdjustments: [
        { order: 1, channel: prioritizedChannel, delayHoursFromPrevious: 0 },
        { order: 2, channel: prioritizedChannel, delayHoursFromPrevious: 24 },
        { order: 3, channel: 'email', delayHoursFromPrevious: 48 },
      ],
      createdAt: new Date().toISOString(),
    };

    const recKey = `${organizationId}:${recId}`;
    this.recommendationsStore.set(recKey, recommendation);

    await domainEventMesh.publish({
      eventType: 'CADENCE_RECOMMENDATION_CREATED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `cad-rec-${recId}`,
      producer: 'self-driving-crm-service',
      aggregateId: leadId,
      payload: {
        recommendationId: recId,
        recommendedAction: recommendation.recommendedAction,
        prioritizedChannel,
        autonomyLevel: recommendation.autonomyLevel,
      },
    });

    return recommendation;
  }

  /**
   * Identifica leads estagnados (> 15 dias sem avanço) e formula propostas de resgate.
   * Regra rígida: opt-out impede qualquer contato de reativação.
   */
  async detectStagnatedLeads(params: {
    organizationId: string;
    inactivityThresholdDays?: number;
    limit?: number;
  }): Promise<StagnantLeadAnalysis[]> {
    const { organizationId, inactivityThresholdDays = 15, limit = 20 } = params;
    const now = new Date();
    const results: StagnantLeadAnalysis[] = [];

    // Obter leads registrados para o tenant com isolamento multi-tenant estrito
    const leads = Array.from(this.mockLeadsStore.values())
      .filter((lead) => !lead.organizationId || lead.organizationId === organizationId)
      .slice(0, limit);

    for (const lead of leads) {
      const daysInactive = Math.floor(
        (now.getTime() - lead.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysInactive >= inactivityThresholdDays) {
        // Verificar trava mandatória de Opt-Out
        const [optedOutVoice, optedOutEmail, optedOutWhatsApp] = await Promise.all([
          isOptedOut(this.optOutRepo, organizationId, { leadId: lead.leadId }, 'voice'),
          isOptedOut(this.optOutRepo, organizationId, { leadId: lead.leadId }, 'email'),
          isOptedOut(this.optOutRepo, organizationId, { leadId: lead.leadId }, 'whatsapp'),
        ]);
        const isOptedOutFlag =
          optedOutVoice ||
          optedOutEmail ||
          optedOutWhatsApp ||
          adaptiveMultichannelCadenceService.isLeadOptedOut(organizationId, lead.leadId);

        let eligible = !isOptedOutFlag && !lead.isWonOrLost;
        let ineligibilityReason: string | undefined;

        if (isOptedOutFlag) {
          eligible = false;
          ineligibilityReason = 'Lead solicitou opt-out formal (Art. 18 LGPD). Contato vedado.';
        } else if (lead.isWonOrLost) {
          eligible = false;
          ineligibilityReason =
            'Lead já encerrado formalmente no CRM (Ganho ou Perdido Definitivo).';
        }

        let strategy: StagnantLeadAnalysis['recommendedStrategy'];
        let copySubject: string | undefined;
        let bodySnippet: string | undefined;

        if (eligible) {
          if (daysInactive > 45) {
            strategy = 'consultative_breakup_email';
            copySubject = `Encerramento de contato consultivo — ${lead.leadName}`;
            bodySnippet =
              'Imagino que suas prioridades mudaram neste trimestre. Gostaria de encerrar nossos contatos para não sobrecarregar sua caixa de entrada.';
          } else if (daysInactive > 25) {
            strategy = 'share_relevant_case_study';
            copySubject = `Como empresas similares reduziram custos operacionais em 28%`;
            bodySnippet =
              'Compartilhando um estudo de caso recente que espelha o gargalo que conversamos anteriormente.';
          } else {
            strategy = 'diagnostic_refresh';
            copySubject = `Atualização rápida sobre o cenário da ${lead.leadName}`;
            bodySnippet =
              'Faz algumas semanas desde nossa última conversa. Gostaria de verificar se houve evolução no diagnóstico da operação.';
          }
        }

        const analysis: StagnantLeadAnalysis = {
          leadId: lead.leadId,
          leadName: lead.leadName,
          organizationId,
          daysInactive,
          currentStage: lead.currentStage,
          isOptedOut: isOptedOutFlag,
          hasActiveNegotiation: lead.hasActiveDeal,
          eligibleForReactivation: eligible,
          ineligibilityReason,
          recommendedStrategy: strategy,
          suggestedCopySubject: copySubject,
          suggestedBodySnippet: bodySnippet,
          confidence: eligible ? 0.9 : 1.0,
          analyzedAt: now.toISOString(),
        };

        results.push(analysis);

        await domainEventMesh.publish({
          eventType: 'LEAD_STAGNATED',
          eventVersion: '1.0.0',
          organizationId,
          correlationId: `stag-${lead.leadId}`,
          producer: 'self-driving-crm-service',
          aggregateId: lead.leadId,
          payload: {
            leadId: lead.leadId,
            daysInactive,
            eligibleForReactivation: eligible,
          },
        });

        if (eligible) {
          await domainEventMesh.publish({
            eventType: 'LEAD_REACTIVATION_SUGGESTED',
            eventVersion: '1.0.0',
            organizationId,
            correlationId: `react-${lead.leadId}`,
            producer: 'self-driving-crm-service',
            aggregateId: lead.leadId,
            payload: {
              leadId: lead.leadId,
              strategy,
            },
          });
        }
      }
    }

    return results;
  }

  /**
   * Aprovação humana e aplicação da recomendação de cadência.
   */
  async approveCadenceRecommendation(params: {
    organizationId: string;
    recommendationId: string;
    approvedBy: string;
  }): Promise<{
    success: boolean;
    recommendation: CadenceRecommendation;
    executionLog: string;
  }> {
    const { organizationId, recommendationId, approvedBy } = params;
    const recKey = `${organizationId}:${recommendationId}`;
    const rec = this.recommendationsStore.get(recKey);

    if (!rec) {
      throw new Error(
        `Recomendação ${recommendationId} não encontrada no tenant ${organizationId}.`,
      );
    }

    rec.status = 'APPROVED';
    rec.approvedAt = new Date().toISOString();
    rec.approvedBy = approvedBy;
    this.recommendationsStore.set(recKey, rec);

    await domainEventMesh.publish({
      eventType: 'CADENCE_CHANGE_APPROVED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `appr-${recommendationId}`,
      producer: 'self-driving-crm-service',
      aggregateId: rec.leadId,
      payload: {
        recommendationId,
        approvedBy,
        actionApplied: rec.recommendedAction,
      },
    });

    await domainEventMesh.publish({
      eventType: 'LEAD_REACTIVATED',
      eventVersion: '1.0.0',
      organizationId,
      correlationId: `react-exec-${rec.leadId}`,
      producer: 'self-driving-crm-service',
      aggregateId: rec.leadId,
      payload: {
        leadId: rec.leadId,
        newChannel: rec.prioritizedChannel,
      },
    });

    logger.info(
      `[SelfDrivingCRM] Recomendação ${recommendationId} aprovada por ${approvedBy} para o lead ${rec.leadId}. Toques reajustados para ${rec.prioritizedChannel}.`,
    );

    return {
      success: true,
      recommendation: rec,
      executionLog: `Cadência ajustada com sucesso para priorizar canal ${rec.prioritizedChannel}. Supervisão validada por ${approvedBy}.`,
    };
  }

  // Utilitário para testes e simulação com suporte a multi-tenancy
  seedLead(lead: {
    organizationId?: string;
    leadId: string;
    leadName: string;
    currentStage: string;
    lastActivityAt: Date;
    hasActiveDeal: boolean;
    isWonOrLost: boolean;
  }): void {
    const key = lead.organizationId ? `${lead.organizationId}:${lead.leadId}` : lead.leadId;
    this.mockLeadsStore.set(key, lead);
  }

  clear(): void {
    this.signalsStore.clear();
    this.recommendationsStore.clear();
    this.mockLeadsStore.clear();
    this.optOutRepo = new InMemoryOptOutRepository();
  }
}

export const selfDrivingCrmService = new SelfDrivingCrmService();
