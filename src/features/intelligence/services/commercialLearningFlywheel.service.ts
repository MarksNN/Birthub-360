import { randomUUID } from 'node:crypto';
import type { FewShotCopyItem } from '../../../shared/contracts/dataFlywheel.contract.js';
import { logger } from '../../../lib/logger.js';

export interface ApproachRecord {
  id: string;
  organizationId: string;
  leadId: string;
  channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL';
  segment: string;
  approachText: string;
  sentAt: string;
}

export class CommercialLearningFlywheelService {
  private approaches: Map<string, ApproachRecord> = new Map();
  private curatedFewShotLibrary: Map<string, FewShotCopyItem> = new Map();
  private static ATTRIBUTION_WINDOW_DAYS = 30;

  /**
   * Registra uma abordagem comercial gerada e enviada para um lead com autorização.
   */
  async recordApproachSent(approach: {
    organizationId: string;
    leadId: string;
    channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL';
    segment: string;
    approachText: string;
  }): Promise<ApproachRecord> {
    if (!approach.organizationId) {
      throw new Error('Tenancy violation: organizationId é obrigatório para registrar abordagem');
    }

    const id = `appr-${randomUUID()}`;
    const record: ApproachRecord = {
      ...approach,
      id,
      sentAt: new Date().toISOString(),
    };

    this.approaches.set(id, record);

    logger.info(
      { id, organizationId: record.organizationId, leadId: record.leadId, channel: record.channel },
      'CommercialLearningFlywheel: Abordagem registrada para acompanhamento de atribuição',
    );

    return record;
  }

  /**
   * Avalia um resultado comercial real (Reunião Agendada ou Negócio Ganho)
   * e valida a atribuição causal com a abordagem enviada.
   */
  async evaluateCommercialOutcome(outcome: {
    organizationId: string;
    leadId: string;
    dealId?: string;
    outcomeType: 'MEETING_SCHEDULED' | 'DEAL_WON';
    occurredAt?: string;
  }): Promise<FewShotCopyItem | null> {
    const outcomeDate = outcome.occurredAt ? new Date(outcome.occurredAt) : new Date();

    // Localiza abordagens prévias para este lead no mesmo tenant
    const candidateApproaches = Array.from(this.approaches.values()).filter(
      (a) => a.organizationId === outcome.organizationId && a.leadId === outcome.leadId,
    );

    if (candidateApproaches.length === 0) {
      logger.info(
        { leadId: outcome.leadId, organizationId: outcome.organizationId },
        'CommercialLearningFlywheel: Nenhuma abordagem prévia rastreada para atribuição',
      );
      return null;
    }

    // Ordena da mais recente para a mais antiga
    candidateApproaches.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    const matched = candidateApproaches[0];

    const diffDays =
      (outcomeDate.getTime() - new Date(matched.sentAt).getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays < 0 || diffDays > CommercialLearningFlywheelService.ATTRIBUTION_WINDOW_DAYS) {
      logger.warn(
        { leadId: outcome.leadId, diffDays, windowLimit: CommercialLearningFlywheelService.ATTRIBUTION_WINDOW_DAYS },
        'CommercialLearningFlywheel: Resultado fora da janela de atribuição causal. Não promovido.',
      );
      return null;
    }

    // Qualificação da abordagem vencedora para a biblioteca few-shot
    const fewShotId = `fewshot-${randomUUID()}`;
    const fewShotItem: FewShotCopyItem = {
      id: fewShotId,
      organizationId: outcome.organizationId,
      channel: matched.channel,
      segment: matched.segment,
      approachText: matched.approachText,
      outcomeStatus: outcome.outcomeType,
      attributionEvidence: {
        leadId: outcome.leadId,
        dealId: outcome.dealId,
        conversionWindowDays: Math.round(diffDays),
        metrics: {
          occurredAt: outcomeDate.toISOString(),
          sentAt: matched.sentAt,
        },
      },
      confidence: outcome.outcomeType === 'DEAL_WON' ? 0.98 : 0.88,
      promotedAt: new Date().toISOString(),
      isActive: true,
    };

    this.curatedFewShotLibrary.set(fewShotId, fewShotItem);

    logger.info(
      {
        fewShotId,
        organizationId: outcome.organizationId,
        channel: fewShotItem.channel,
        outcome: fewShotItem.outcomeStatus,
        conversionDays: Math.round(diffDays),
      },
      'CommercialLearningFlywheel: Abordagem qualificada e promovida à biblioteca Few-Shot com evidência comprovada',
    );

    return fewShotItem;
  }

  /**
   * Recupera exemplos few-shot qualificados para alimentar prompts do AI Gateway.
   * Isolamento estrito por tenant e canal.
   */
  async getFewShotExamples(
    organizationId: string,
    channel: 'LINKEDIN' | 'WHATSAPP' | 'EMAIL',
    segment?: string,
    limit: number = 3,
  ): Promise<FewShotCopyItem[]> {
    const list = Array.from(this.curatedFewShotLibrary.values()).filter(
      (item) =>
        item.organizationId === organizationId &&
        item.channel === channel &&
        item.isActive &&
        (!segment || item.segment.toLowerCase() === segment.toLowerCase()),
    );

    // Prioriza negociações ganhas (DEAL_WON)
    list.sort((a, b) => {
      if (a.outcomeStatus === 'DEAL_WON' && b.outcomeStatus !== 'DEAL_WON') return -1;
      if (b.outcomeStatus === 'DEAL_WON' && a.outcomeStatus !== 'DEAL_WON') return 1;
      return b.confidence - a.confidence;
    });

    return list.slice(0, limit);
  }

  clear(): void {
    this.approaches.clear();
    this.curatedFewShotLibrary.clear();
  }
}

export const commercialLearningFlywheel = new CommercialLearningFlywheelService();
