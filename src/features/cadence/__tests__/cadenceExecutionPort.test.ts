import { describe, expect, it, vi } from 'vitest';
import type {
  EnqueueSwarmActionInput,
  SwarmTouchNotification,
} from '../application/CadenceExecutionPort.js';
import {
  type CadenceChannelDispatcherPort,
  CadenceExecutionService,
  type TaskCreationPort,
} from '../application/CadenceExecutionService.js';
import type { LeadSubjectResolver } from '../application/cadenceService.js';
import {
  type CadenceRunState,
  type CadenceSequenceDefinition,
  recordTouchAttempt,
  startCadenceRun,
} from '../domain/cadence.js';
import { InMemoryCadenceRateLimitPort } from '../infra/InMemoryCadenceRateLimitPort.js';
import { InMemoryCadenceRunRepository } from '../infra/InMemoryCadenceRunRepository.js';
import { InMemoryOptOutRepository } from '../infra/InMemoryOptOutRepository.js';

const SEGUNDA_10H_SP = new Date('2026-08-03T13:00:00Z'); // 10:00 horário de Brasília
const SEGUNDA_22H_SP = new Date('2026-08-04T01:00:00Z'); // 22:00 horário de Brasília
const DOMINGO_14H_SP = new Date('2026-08-02T17:00:00Z'); // Domingo 14:00

describe('CadenceExecutionPort (Integração Swarm ↔ Cadência)', () => {
  const organizationId = 'org-birth-360';
  const leadId = 'lead-42';

  const mockSubjectResolver: LeadSubjectResolver = {
    async resolve(orgId, lId) {
      return {
        leadId: lId,
        email: 'diretor@transportadora.com.br',
        phoneE164: '+5511999998888',
      };
    },
  };

  const seedTouches = (
    runRepo: InMemoryCadenceRunRepository,
    lId: string,
    channel: 'email' | 'whatsapp' | 'voice',
    count: number,
    sentAt: Date,
  ) => {
    let run: CadenceRunState = startCadenceRun({
      id: `run-hist-${lId}-${channel}`,
      organizationId,
      leadId: lId,
      sequenceId: `seq-hist-${channel}`,
      startedAt: sentAt,
    });
    const seq: CadenceSequenceDefinition = {
      id: `seq-hist-${channel}`,
      name: 'histórico',
      touches: Array.from({ length: count }, (_, i) => ({
        order: i + 1,
        channel,
        delayHoursFromPrevious: 0,
      })),
    };
    for (let i = 0; i < count; i++) {
      run = recordTouchAttempt(run, seq, seq.touches[i], sentAt, {
        result: 'sent',
      });
    }
    runRepo.seed(run);
  };

  const createTestHarness = (options?: {
    isWithinBusinessWindow?: (now: Date) => boolean;
    dispatcherResults?: {
      whatsapp?: 'delivered' | 'failed' | 'bounced';
      email?: 'delivered' | 'failed' | 'bounced';
      voice?: 'delivered' | 'failed' | 'bounced';
    };
  }) => {
    const optOutRepo = new InMemoryOptOutRepository();
    const runRepo = new InMemoryCadenceRunRepository();
    const rateLimitPort = new InMemoryCadenceRateLimitPort(
      runRepo,
      () => 'diretor@transportadora.com.br',
    );
    const notifications: SwarmTouchNotification[] = [];

    const mockDispatcher: CadenceChannelDispatcherPort = {
      dispatchWhatsApp: vi.fn().mockResolvedValue({
        result: options?.dispatcherResults?.whatsapp ?? 'delivered',
        providerMessageId: 'wa-msg-123',
      }),
      dispatchEmail: vi.fn().mockResolvedValue({
        result: options?.dispatcherResults?.email ?? 'delivered',
        providerMessageId: 'email-msg-456',
      }),
      dispatchVoice: vi.fn().mockResolvedValue({
        result: options?.dispatcherResults?.voice ?? 'delivered',
        sessionId: 'voice-session-789',
      }),
    };

    const mockTaskPort: TaskCreationPort = {
      createTask: vi.fn().mockResolvedValue({ id: 'crm-task-999' }),
    };

    const service = new CadenceExecutionService({
      optOutRepo,
      subjectResolver: mockSubjectResolver,
      rateLimitPort,
      dispatcher: mockDispatcher,
      taskPort: mockTaskPort,
      isWithinBusinessWindow: options?.isWithinBusinessWindow,
      notificationListeners: [(notif) => notifications.push(notif)],
    });

    return {
      service,
      optOutRepo,
      runRepo,
      rateLimitPort,
      mockDispatcher,
      mockTaskPort,
      notifications,
    };
  };

  const sampleActionInput = (
    channel: 'whatsapp' | 'email' | 'voice' | 'task' = 'whatsapp',
  ): EnqueueSwarmActionInput => ({
    organizationId,
    leadId,
    channel,
    content: 'Olá, verificamos seu interesse na plataforma Birth Hub 360.',
    metadata: {
      recommendationReason: 'stalled_proposal',
      score: 92,
      agentRole: 'Closer',
      triggerDetail: 'Proposta estagnada há 48h sem retorno.',
      correlationId: 'swarm-corr-001',
    },
  });

  describe('1. Despacho com sucesso a partir de recomendação do Swarm', () => {
    it('enfileira e auto-executa toque de WhatsApp com sucesso dentro da janela comercial', async () => {
      const { service, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      const input = sampleActionInput('whatsapp');
      const result = await service.enqueueAction(input, {
        now: SEGUNDA_10H_SP,
        autoExecute: true,
      });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('executed');
      expect(result.deliveryStatus).toBe('delivered');
      expect(mockDispatcher.dispatchWhatsApp).toHaveBeenCalledTimes(1);

      // Notificação ao Swarm comprovada
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        leadId,
        organizationId,
        channel: 'whatsapp',
        status: 'delivered',
        details: { providerMessageId: 'wa-msg-123' },
      });
    });

    it('enfileira toque de E-mail para posterior agendamento quando autoExecute não é solicitado', async () => {
      const { service, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      const input = sampleActionInput('email');
      const result = await service.enqueueAction(input, {
        now: SEGUNDA_10H_SP,
        autoExecute: false,
      });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('queued');
      expect(mockDispatcher.dispatchEmail).not.toHaveBeenCalled();
      expect(notifications).toHaveLength(0); // Não executou ainda, apenas enfileirou
    });

    it('executa toque de SDR Voice via executeAction com sucesso', async () => {
      const { service, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      const input = sampleActionInput('voice');
      const result = await service.executeAction(input, { now: SEGUNDA_10H_SP });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('executed');
      expect(result.deliveryStatus).toBe('delivered');
      expect(mockDispatcher.dispatchVoice).toHaveBeenCalledTimes(1);
      expect(notifications[0].status).toBe('delivered');
      expect(notifications[0].channel).toBe('voice');
    });

    it('cria tarefa interna no CRM (canal task) e notifica status delivered', async () => {
      const { service, mockTaskPort, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      const input = sampleActionInput('task');
      const result = await service.executeAction(input, { now: SEGUNDA_10H_SP });

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('executed');
      expect(result.deliveryStatus).toBe('delivered');
      expect(mockTaskPort.createTask).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId,
          leadId,
          title: '[Swarm] stalled_proposal: Proposta estagnada há 48h sem retorno.',
        }),
      );
      expect(notifications[0].status).toBe('delivered');
      expect(notifications[0].channel).toBe('task');
    });
  });

  describe('2. Regras de horário comercial e janela de contato', () => {
    it('rejeita disparo fora da janela comercial (ex.: 22:00) e notifica falha ao Swarm', async () => {
      const { service, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: (now) => now.getTime() === SEGUNDA_10H_SP.getTime(),
      });

      const input = sampleActionInput('whatsapp');
      const result = await service.executeAction(input, { now: SEGUNDA_22H_SP });

      expect(result.accepted).toBe(false);
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('outside-business-window');
      expect(result.deliveryStatus).toBe('failed');
      expect(mockDispatcher.dispatchWhatsApp).not.toHaveBeenCalled();

      // Swarm notificado da recusa por política de horário comercial
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        leadId,
        organizationId,
        channel: 'whatsapp',
        status: 'failed',
        details: { reason: 'outside-business-window' },
      });
    });

    it('rejeita ligação de voz em final de semana (Domingo) e não chama provedor', async () => {
      const { service, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: (now) => now.getTime() === SEGUNDA_10H_SP.getTime(),
      });

      const input = sampleActionInput('voice');
      const result = await service.executeAction(input, { now: DOMINGO_14H_SP });

      expect(result.accepted).toBe(false);
      expect(result.rejectionReason).toBe('outside-business-window');
      expect(mockDispatcher.dispatchVoice).not.toHaveBeenCalled();
      expect(notifications[0].status).toBe('failed');
    });
  });

  describe('3. Proteção rigorosa de Opt-Out', () => {
    it('rejeita disparo de canal externo se lead possui opt-out registrado no canal', async () => {
      const { service, optOutRepo, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      await optOutRepo.create({
        organizationId,
        scope: 'whatsapp',
        originChannel: 'whatsapp',
        leadId,
        email: null,
        phoneE164: '+5511999998888',
        reason: 'Pedido no WhatsApp',
        evidence: null,
        requestedBy: null,
      });

      const input = sampleActionInput('whatsapp');
      const result = await service.executeAction(input, { now: SEGUNDA_10H_SP });

      expect(result.accepted).toBe(false);
      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('opted-out');
      expect(mockDispatcher.dispatchWhatsApp).not.toHaveBeenCalled();
      expect(notifications[0].status).toBe('failed');
      expect(notifications[0].details?.reason).toBe('opted-out');
    });

    it('rejeita qualquer canal externo se lead possui opt-out global', async () => {
      const { service, optOutRepo, mockDispatcher } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      await optOutRepo.create({
        organizationId,
        scope: 'global',
        originChannel: 'manual',
        leadId,
        email: 'diretor@transportadora.com.br',
        phoneE164: null,
        reason: 'Revogação de consentimento geral',
        evidence: null,
        requestedBy: null,
      });

      const emailResult = await service.executeAction(sampleActionInput('email'), {
        now: SEGUNDA_10H_SP,
      });
      expect(emailResult.accepted).toBe(false);
      expect(emailResult.rejectionReason).toBe('opted-out');
      expect(mockDispatcher.dispatchEmail).not.toHaveBeenCalled();
    });
  });

  describe('4. Rate limits da organização e channel-spacing', () => {
    it('rejeita ação quando o limite de toques por contato nas últimas 24h foi atingido', async () => {
      const { service, runRepo, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      // Seeda 3 toques enviados para o lead nas últimas 24h (cap default é 3)
      seedTouches(runRepo, leadId, 'email', 3, new Date(SEGUNDA_10H_SP.getTime() - 2 * 3600_000));

      const input = sampleActionInput('email');
      const result = await service.executeAction(input, { now: SEGUNDA_10H_SP });

      expect(result.accepted).toBe(false);
      expect(result.rejectionReason).toBe('contact-rate-limit');
      expect(mockDispatcher.dispatchEmail).not.toHaveBeenCalled();
      expect(notifications[0].status).toBe('failed');
      expect(notifications[0].details?.reason).toBe('contact-rate-limit');
    });

    it('rejeita ação quando channel-spacing não decorreu entre canais diferentes', async () => {
      const { service, runRepo, mockDispatcher, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
      });

      // Último toque foi de e-mail há apenas 5 minutos
      seedTouches(runRepo, leadId, 'email', 1, new Date(SEGUNDA_10H_SP.getTime() - 5 * 60_000));

      // Swarm tenta disparar WhatsApp agora (precisa de 30min de espaçamento entre canais diferentes)
      const input = sampleActionInput('whatsapp');
      const result = await service.executeAction(input, { now: SEGUNDA_10H_SP });

      expect(result.accepted).toBe(false);
      expect(result.rejectionReason).toBe('channel-spacing');
      expect(mockDispatcher.dispatchWhatsApp).not.toHaveBeenCalled();
      expect(notifications[0].status).toBe('failed');
    });
  });

  describe('5. Notificação de status de entrega do toque (delivered, bounced, replied, failed)', () => {
    it('notifica status bounced quando o provedor rejeita entrega do e-mail', async () => {
      const { service, notifications } = createTestHarness({
        isWithinBusinessWindow: () => true,
        dispatcherResults: { email: 'bounced' },
      });

      const input = sampleActionInput('email');
      const result = await service.executeAction(input, { now: SEGUNDA_10H_SP });

      expect(result.deliveryStatus).toBe('bounced');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].status).toBe('bounced');
    });

    it('permite registrar notificação de resposta do lead (replied) e propaga aos listeners', async () => {
      const { service, notifications } = createTestHarness();

      await service.notifyDeliveryStatus({
        actionId: 'action-rep-1',
        leadId,
        organizationId,
        channel: 'whatsapp',
        status: 'replied',
        occurredAt: new Date(),
        details: { providerMessageId: 'reply-wa-99' },
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].status).toBe('replied');
      expect(notifications[0].channel).toBe('whatsapp');
    });
  });
});
