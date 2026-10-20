import { logger } from '../../../../lib/logger.js';
import { prisma } from '../../../../lib/prisma.js';
import { domainEventMesh } from '../../../../lib/queue/domainEventMesh.service.js';
import type {
  BitrixWebhookEventPayload,
  DomainEventEnvelope,
  WhatsAppMessageEventPayload,
} from '../../../../shared/contracts/domainEventMesh.contract.js';
import { postCommentToBitrix, syncActivityToBitrix } from '../service/outboundSync.js';

/**
 * Ponte entre o barramento canônico de eventos (DomainEventMesh) e as integrações
 * de CRM e Mensageria (Bitrix24 e WhatsApp).
 *
 * Responsável por:
 * 1. Espelhar automaticamente interações de WhatsApp, ligações e reuniões no Bitrix24.
 * 2. Publicar alertas de risco comercial e opt-out diretamente na timeline de Deals/Leads do Bitrix24.
 * 3. Reagir a webhooks de entrada do Bitrix24 disparando fluxos de mensageria e engajamento.
 */
export class BitrixEventMeshBridgeService {
  private isRegistered = false;

  public register(): void {
    if (this.isRegistered) return;
    this.isRegistered = true;

    // ── 1. Espelhamento de WhatsApp no CRM Bitrix24 ─────────────────────────────
    domainEventMesh.subscribe('WHATSAPP_MESSAGE_RECEIVED', async (event) => {
      await this.handleWhatsAppMessage(event, 'inbound');
    });

    domainEventMesh.subscribe('WHATSAPP_MESSAGE_SENT', async (event) => {
      await this.handleWhatsAppMessage(event, 'outbound');
    });

    // ── 2. Espelhamento de Chamadas e Voz no CRM Bitrix24 ───────────────────────
    domainEventMesh.subscribe('VOICE_CALL_COMPLETED', async (event) => {
      await this.handleVoiceCall(event);
    });

    domainEventMesh.subscribe('SDR_CALL_COMPLETED', async (event) => {
      await this.handleVoiceCall(event);
    });

    // ── 3. Espelhamento de Reuniões no CRM Bitrix24 ─────────────────────────────
    domainEventMesh.subscribe('CRM_MEETING_SCHEDULED', async (event) => {
      await this.handleMeetingScheduled(event);
    });

    domainEventMesh.subscribe('MEETING_SCHEDULED_CALENDAR', async (event) => {
      await this.handleMeetingScheduled(event);
    });

    // ── 4. Alertas Comerciais e Riscos na Timeline do Bitrix24 ──────────────────
    domainEventMesh.subscribe('DEAL_RISK_SPIKED', async (event) => {
      await this.handleDealRisk(event);
    });

    domainEventMesh.subscribe('DEVILS_ADVOCATE_ALERT', async (event) => {
      await this.handleDealRisk(event);
    });

    domainEventMesh.subscribe('COMMERCIAL_BOTTLENECK_DETECTED', async (event) => {
      await this.handleCommercialBottleneck(event);
    });

    // ── 5. Propostas Comerciais na Timeline do Bitrix24 ─────────────────────────
    domainEventMesh.subscribe('COMMERCIAL_PROPOSAL_DRAFTED', async (event) => {
      await this.handleProposalDrafted(event);
    });

    // ── 6. Opt-Out e LGPD Unificado na Timeline do Bitrix24 ────────────────────
    domainEventMesh.subscribe('CROSS_CHANNEL_OPTOUT_ENFORCED', async (event) => {
      await this.handleOptOutEnforced(event);
    });

    // ── 7. Reativação de Leads na Timeline do Bitrix24 ──────────────────────────
    domainEventMesh.subscribe('LEAD_REACTIVATED', async (event) => {
      await this.handleLeadReactivated(event);
    });

    // ── 8. Webhooks de Entrada do Bitrix24 -> Automações e Mensageria ───────────
    domainEventMesh.subscribe('BITRIX_WEBHOOK_RECEIVED', async (event) => {
      await this.handleBitrixWebhookInbound(event);
    });

    logger.info('[BitrixEventMeshBridge] Registrado com sucesso nos eventos do DomainEventMesh.');
  }

  private async handleWhatsAppMessage(
    event: DomainEventEnvelope,
    direction: 'inbound' | 'outbound',
  ): Promise<void> {
    try {
      const payload = event.payload as unknown as WhatsAppMessageEventPayload;
      const leadId = payload.leadId;
      if (!leadId) {
        return;
      }

      const subject =
        direction === 'inbound'
          ? `Mensagem WhatsApp recebida (${payload.phoneE164})`
          : `Mensagem WhatsApp enviada (${payload.phoneE164})`;

      const description = payload.body
        ? `Conteúdo: "${payload.body.slice(0, 500)}"`
        : 'Mensagem sem texto ou anexo de mídia.';

      await syncActivityToBitrix(event.organizationId, leadId, {
        type: 'whatsapp',
        subject,
        description,
        direction,
        completed: true,
      });

      logger.info(
        { organizationId: event.organizationId, leadId, eventId: event.eventId },
        '[BitrixEventMeshBridge] Mensagem WhatsApp sincronizada com Bitrix24 com sucesso.',
      );
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao sincronizar WhatsApp com Bitrix24.',
      );
    }
  }

  private async handleVoiceCall(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId =
        (payload.leadId as string) ||
        (event.aggregateId.startsWith('lead-')
          ? event.aggregateId.replace('lead-', '')
          : event.aggregateId);

      if (!leadId) return;

      const duration =
        typeof payload.durationSeconds === 'number' ? payload.durationSeconds : undefined;
      const summary = typeof payload.summary === 'string' ? payload.summary : '';

      await syncActivityToBitrix(event.organizationId, leadId, {
        type: 'call',
        subject: `Ligação telefônica / VoiceHub (${event.eventType})`,
        description: summary ? `Resumo da chamada: ${summary}` : 'Chamada de voz finalizada.',
        durationSeconds: duration,
        direction: 'outbound',
        completed: true,
      });
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao sincronizar chamada de voz com Bitrix24.',
      );
    }
  }

  private async handleMeetingScheduled(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId =
        (payload.leadId as string) ||
        (event.aggregateId.startsWith('lead-')
          ? event.aggregateId.replace('lead-', '')
          : event.aggregateId);

      if (!leadId) return;

      const title =
        typeof payload.title === 'string' ? payload.title : 'Reunião comercial agendada';
      const scheduledAt = typeof payload.scheduledAt === 'string' ? payload.scheduledAt : '';

      await syncActivityToBitrix(event.organizationId, leadId, {
        type: 'meeting',
        subject: `📅 ${title}`,
        description: scheduledAt
          ? `Data agendada: ${scheduledAt}`
          : 'Reunião confirmada no calendário.',
        completed: false,
      });
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao sincronizar reunião com Bitrix24.',
      );
    }
  }

  private async handleDealRisk(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId = (payload.leadId as string) || event.aggregateId;

      if (!leadId) return;

      const reason =
        typeof payload.reason === 'string'
          ? payload.reason
          : typeof payload.risk === 'string'
            ? payload.risk
            : 'Risco elevado detectado na negociação';
      const score = payload.riskScore != null ? ` (Score de Risco: ${payload.riskScore})` : '';

      const comment = `⚠️ [Alerta IA Birth Hub 360 - ${event.eventType}]${score}\n${reason}\nRecomendação: Avaliar histórico do cliente ou acionar roleplay com o gestor.`;

      await postCommentToBitrix(event.organizationId, leadId, comment);
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao registrar alerta de risco na timeline do Bitrix24.',
      );
    }
  }

  private async handleCommercialBottleneck(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId = (payload.leadId as string) || event.aggregateId;

      if (!leadId) return;

      const bottleneck =
        typeof payload.bottleneck === 'string' ? payload.bottleneck : 'Gargalo no funil de vendas';
      const comment = `🔍 [Gargalo Comercial Detectado]\n${bottleneck}\nSugerido avanço de etapa ou contato ativo.`;

      await postCommentToBitrix(event.organizationId, leadId, comment);
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao registrar gargalo comercial no Bitrix24.',
      );
    }
  }

  private async handleProposalDrafted(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId = (payload.leadId as string) || event.aggregateId;

      if (!leadId) return;

      const proposalId = typeof payload.proposalId === 'string' ? payload.proposalId : '';
      const totalValue = payload.totalValue != null ? `Valor: R$ ${payload.totalValue}` : '';
      const comment = `📄 [Proposta Comercial Elaborada]\nProposta ${proposalId} gerada no Birth Hub 360. ${totalValue}\nPronta para apresentação e assinatura.`;

      await postCommentToBitrix(event.organizationId, leadId, comment);
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao registrar proposta comercial no Bitrix24.',
      );
    }
  }

  private async handleOptOutEnforced(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId = (payload.leadId as string) || event.aggregateId;

      if (!leadId) return;

      const reason =
        typeof payload.reason === 'string' ? payload.reason : 'Solicitação do titular (LGPD)';
      const comment = `🛑 [LGPD / Opt-out Unificado Aplicado]\nO lead solicitou cancelamento de abordagens comerciais.\nMotivo: ${reason}\nTodos os canais automatizados (WhatsApp, Voz, E-mail) foram bloqueados para este contato.`;

      await postCommentToBitrix(event.organizationId, leadId, comment);
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao registrar opt-out unificado no Bitrix24.',
      );
    }
  }

  private async handleLeadReactivated(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = (event.payload || {}) as Record<string, unknown>;
      const leadId = (payload.leadId as string) || event.aggregateId;

      if (!leadId) return;

      const channel = typeof payload.channel === 'string' ? `Canal: ${payload.channel}` : '';
      const comment = `🚀 [Lead Reativado com Sucesso]\nLead recuperado via automação autônoma do Birth Hub 360. ${channel}\nOportunidade restabelecida no funil.`;

      await postCommentToBitrix(event.organizationId, leadId, comment);
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao registrar reativação no Bitrix24.',
      );
    }
  }

  private async handleBitrixWebhookInbound(event: DomainEventEnvelope): Promise<void> {
    try {
      const payload = event.payload as unknown as BitrixWebhookEventPayload;
      if (!payload?.leadId) return;

      // Se o webhook informou mudança de estágio para um lead local existente:
      // Podemos verificar se há automação de boas-vindas / notificação WhatsApp
      const lead = await prisma.lead.findFirst({
        where: { id: payload.leadId, organizationId: event.organizationId },
        include: { contact: true },
      });

      if (!lead?.contact) return;

      const phone = lead.contact.whatsapp || lead.contact.phone;
      if (!phone) return;

      // Exemplo de fluxo automático de mensageria:
      // Se lead mudou de estágio no Bitrix para 'PROPOSTA' ou 'APRESENTACAO',
      // notifica ou registra evento de engajamento
      logger.info(
        {
          organizationId: event.organizationId,
          leadId: lead.id,
          stageId: payload.stageId,
          eventType: payload.eventType,
        },
        '[BitrixEventMeshBridge] Webhook Bitrix processado com sucesso para lead local.',
      );
    } catch (err) {
      logger.warn(
        { err, eventId: event.eventId, organizationId: event.organizationId },
        '[BitrixEventMeshBridge] Falha não-bloqueante ao processar webhook de entrada do Bitrix24.',
      );
    }
  }
}

export const bitrixEventMeshBridge = new BitrixEventMeshBridgeService();
