import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bitrixEventMeshBridge } from '../../../src/features/integrations/bitrix/services/bitrixEventMeshBridge.service.js';
import { domainEventMesh } from '../../../src/lib/queue/domainEventMesh.service.js';
import * as outboundSync from '../../../src/features/integrations/bitrix/service/outboundSync.js';
import { prisma } from '../../../src/lib/prisma.js';

describe('BitrixEventMeshBridgeService — Sincronização de Webhooks Bitrix24 & WhatsApp', () => {
  const syncActivitySpy = vi.spyOn(outboundSync, 'syncActivityToBitrix').mockResolvedValue({ bitrixActivityId: 101 });
  const postCommentSpy = vi.spyOn(outboundSync, 'postCommentToBitrix').mockResolvedValue({
    entityType: 'deal',
    bitrixRecordId: 'deal-999',
  });

  beforeEach(() => {
    vi.clearAllMocks();
    domainEventMesh.clearProcessedEvents();
    bitrixEventMeshBridge.register();
  });

  it('deve sincronizar mensagem recebida de WhatsApp no Bitrix24 como atividade', async () => {
    await domainEventMesh.publish({
      eventType: 'WHATSAPP_MESSAGE_RECEIVED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'wa-recv-001',
      producer: 'integrations.whatsapp',
      aggregateId: 'lead-123',
      payload: {
        waMessageId: 'msg-abc',
        phoneE164: '+5511999998888',
        body: 'Olá, gostaria de saber mais sobre a proposta.',
        direction: 'inbound',
        leadId: 'lead-123',
      },
    });

    expect(syncActivitySpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.objectContaining({
        type: 'whatsapp',
        direction: 'inbound',
        completed: true,
        subject: expect.stringContaining('+5511999998888'),
        description: expect.stringContaining('proposta'),
      }),
    );
  });

  it('deve sincronizar mensagem enviada de WhatsApp no Bitrix24 como atividade outbound', async () => {
    await domainEventMesh.publish({
      eventType: 'WHATSAPP_MESSAGE_SENT',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'wa-send-002',
      producer: 'integrations.whatsapp',
      aggregateId: 'lead-123',
      payload: {
        waMessageId: 'msg-def',
        phoneE164: '+5511999998888',
        body: 'Segue o link do catálogo solicitado.',
        direction: 'outbound',
        leadId: 'lead-123',
      },
    });

    expect(syncActivitySpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.objectContaining({
        type: 'whatsapp',
        direction: 'outbound',
        completed: true,
      }),
    );
  });

  it('deve sincronizar chamada de voz finalizada no Bitrix24', async () => {
    await domainEventMesh.publish({
      eventType: 'VOICE_CALL_COMPLETED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'call-001',
      producer: 'birth-voice',
      aggregateId: 'lead-123',
      payload: {
        leadId: 'lead-123',
        durationSeconds: 145,
        summary: 'Cliente demonstrou alto interesse e solicitou demonstração.',
      },
    });

    expect(syncActivitySpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.objectContaining({
        type: 'call',
        durationSeconds: 145,
        description: expect.stringContaining('alto interesse'),
      }),
    );
  });

  it('deve sincronizar reunião agendada no Bitrix24', async () => {
    await domainEventMesh.publish({
      eventType: 'CRM_MEETING_SCHEDULED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'meeting-001',
      producer: 'calendar-service',
      aggregateId: 'lead-123',
      payload: {
        leadId: 'lead-123',
        title: 'Demo Executiva Birth Hub 360',
        scheduledAt: '2026-10-25T15:00:00Z',
      },
    });

    expect(syncActivitySpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.objectContaining({
        type: 'meeting',
        subject: expect.stringContaining('Demo Executiva'),
        completed: false,
      }),
    );
  });

  it('deve registrar alerta de risco elevado na timeline do Bitrix24', async () => {
    await domainEventMesh.publish({
      eventType: 'DEAL_RISK_SPIKED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'risk-001',
      producer: 'deal-risk-service',
      aggregateId: 'lead-123',
      payload: {
        leadId: 'lead-123',
        riskScore: 85,
        reason: 'Concorrente entrou na conta oferecendo 30% de desconto.',
      },
    });

    expect(postCommentSpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.stringContaining('Score de Risco: 85'),
    );
  });

  it('deve registrar proposta comercial elaborada na timeline do Bitrix24', async () => {
    await domainEventMesh.publish({
      eventType: 'COMMERCIAL_PROPOSAL_DRAFTED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'prop-001',
      producer: 'proposal-service',
      aggregateId: 'lead-123',
      payload: {
        leadId: 'lead-123',
        proposalId: 'PROP-2026-99',
        totalValue: 48000,
      },
    });

    expect(postCommentSpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.stringContaining('PROP-2026-99'),
    );
  });

  it('deve registrar opt-out unificado (LGPD) na timeline do Bitrix24 para bloquear contatos', async () => {
    await domainEventMesh.publish({
      eventType: 'CROSS_CHANNEL_OPTOUT_ENFORCED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'optout-001',
      producer: 'optout-service',
      aggregateId: 'lead-123',
      payload: {
        leadId: 'lead-123',
        reason: 'Solicitação explícita via WhatsApp ("PARE")',
      },
    });

    expect(postCommentSpy).toHaveBeenCalledWith(
      'tenant-alpha',
      'lead-123',
      expect.stringContaining('LGPD / Opt-out Unificado Aplicado'),
    );
  });

  it('deve processar webhook de entrada do Bitrix24 de forma não bloqueante', async () => {
    vi.spyOn(prisma.lead, 'findFirst').mockResolvedValue({
      id: 'lead-123',
      organizationId: 'tenant-alpha',
      contact: {
        phone: '+5511999998888',
        whatsapp: '+5511999998888',
      },
    } as any);

    await domainEventMesh.publish({
      eventType: 'BITRIX_WEBHOOK_RECEIVED',
      eventVersion: '1.0.0',
      organizationId: 'tenant-alpha',
      correlationId: 'webhook-001',
      producer: 'bitrix-webhook-service',
      aggregateId: 'lead-123',
      payload: {
        connectionId: 'conn-1',
        eventType: 'ONCRMLEADUPDATE',
        bitrixRecordId: 'b-77',
        entityType: 'lead',
        leadId: 'lead-123',
        stageId: 'PROPOSAL',
      },
    });

    expect(prisma.lead.findFirst).toHaveBeenCalledWith({
      where: { id: 'lead-123', organizationId: 'tenant-alpha' },
      include: { contact: true },
    });
  });

  it('não deve falhar a emissão do evento quando o Bitrix24 estiver temporariamente fora do ar', async () => {
    syncActivitySpy.mockRejectedValueOnce(new Error('Bitrix API timeout 504'));

    await expect(
      domainEventMesh.publish({
        eventType: 'WHATSAPP_MESSAGE_RECEIVED',
        eventVersion: '1.0.0',
        organizationId: 'tenant-alpha',
        correlationId: 'wa-fail-safe',
        producer: 'integrations.whatsapp',
        aggregateId: 'lead-123',
        payload: {
          waMessageId: 'msg-timeout',
          phoneE164: '+5511999998888',
          body: 'Teste de tolerância a falhas',
          direction: 'inbound',
          leadId: 'lead-123',
        },
      }),
    ).resolves.toBeDefined();
  });
});
