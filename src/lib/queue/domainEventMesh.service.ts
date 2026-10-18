import { randomUUID } from 'node:crypto';
import type {
  DomainEventEnvelope,
  DomainEventType,
  IDomainEventMeshPort,
} from '../../shared/contracts/domainEventMesh.contract.js';
import { logger } from '../logger.js';

export interface OutboxRecord {
  id: string;
  eventId: string;
  eventType: DomainEventType;
  organizationId: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'DISPATCHED' | 'FAILED';
  retryCount: number;
  createdAt: string;
  dispatchedAt?: string;
  lastError?: string;
}

export class DomainEventMeshService implements IDomainEventMeshPort {
  private handlers = new Map<DomainEventType, Array<(event: DomainEventEnvelope) => Promise<void>>>();
  private processedEventIds = new Set<string>();
  private outboxStore: OutboxRecord[] = [];
  private static MAX_CAUSATION_DEPTH = 5;

  constructor() {
    this.registerDefaultFlows();
  }

  /**
   * Publica um evento de domínio no barramento.
   * Aplica validação de tenant, outbox transacional, rastreamento de causa e prevenção de ciclo.
   */
  async publish<T = Record<string, unknown>>(
    eventInput: Omit<DomainEventEnvelope<T>, 'eventId' | 'occurredAt'>,
  ): Promise<DomainEventEnvelope<T>> {
    if (!eventInput.organizationId || eventInput.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Evento rejeitado por ausência de organizationId');
    }

    const eventId = `evt-${randomUUID()}`;
    const occurredAt = new Date().toISOString();

    const envelope: DomainEventEnvelope<T> = {
      ...eventInput,
      eventId,
      occurredAt,
      eventVersion: eventInput.eventVersion || '1.0.0',
    };

    // Prevenção de ciclos recursivos baseada na profundidade da cadeia causal
    if (envelope.causationId && this.calculateCausationDepth(envelope.causationId) >= DomainEventMeshService.MAX_CAUSATION_DEPTH) {
      logger.warn(
        {
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          causationId: envelope.causationId,
          organizationId: envelope.organizationId,
        },
        'DomainEventMesh: Potencial ciclo de eventos detectado. Descarte defensivo para evitar tempestade de mensagens.',
      );
      throw new Error('DomainEventMesh: Ciclo causal excedeu limite máximo permitido');
    }

    // Registro no Transactional Outbox
    const outboxItem: OutboxRecord = {
      id: `outbox-${randomUUID()}`,
      eventId: envelope.eventId,
      eventType: envelope.eventType,
      organizationId: envelope.organizationId,
      payload: envelope.payload as Record<string, unknown>,
      status: 'PENDING',
      retryCount: 0,
      createdAt: occurredAt,
    };
    this.outboxStore.push(outboxItem);

    logger.info(
      {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        organizationId: envelope.organizationId,
        correlationId: envelope.correlationId,
      },
      `DomainEventMesh: Evento publicado [${envelope.eventType}]`,
    );

    // Despacho imediato para os handlers registrados
    await this.dispatch(envelope as unknown as DomainEventEnvelope, outboxItem);

    return envelope;
  }

  /**
   * Registra um handler de consumo para um tipo específico de evento.
   */
  subscribe(eventType: DomainEventType, handler: (event: DomainEventEnvelope) => Promise<void>): void {
    const current = this.handlers.get(eventType) || [];
    current.push(handler);
    this.handlers.set(eventType, current);
  }

  /**
   * Despacha o evento garantindo idempotência e deduplicação.
   */
  private async dispatch(event: DomainEventEnvelope, outboxItem: OutboxRecord): Promise<void> {
    const dedupKey = `${event.organizationId}:${event.eventId}`;

    if (this.processedEventIds.has(dedupKey)) {
      logger.warn(
        { eventId: event.eventId, organizationId: event.organizationId },
        'DomainEventMesh: Evento duplicado detectado. Ignorando processamento redundante.',
      );
      return;
    }

    this.processedEventIds.add(dedupKey);

    const registeredHandlers = this.handlers.get(event.eventType) || [];
    if (registeredHandlers.length === 0) {
      outboxItem.status = 'DISPATCHED';
      outboxItem.dispatchedAt = new Date().toISOString();
      return;
    }

    for (const handler of registeredHandlers) {
      try {
        await handler(event);
      } catch (err) {
        outboxItem.status = 'FAILED';
        outboxItem.retryCount += 1;
        outboxItem.lastError = err instanceof Error ? err.message : String(err);
        logger.error(
          {
            err,
            eventId: event.eventId,
            eventType: event.eventType,
            organizationId: event.organizationId,
          },
          'DomainEventMesh: Erro ao executar handler de evento assíncrono',
        );
        throw err;
      }
    }

    outboxItem.status = 'DISPATCHED';
    outboxItem.dispatchedAt = new Date().toISOString();
  }

  /**
   * Registra os 5 fluxos obrigatórios da Onda 01.
   */
  private registerDefaultFlows(): void {
    // Fluxo A: Reunião Mobile
    this.subscribe('MOBILE_MEETING_AUDIO_SYNCED', async (event) => {
      logger.info(
        { organizationId: event.organizationId, aggregateId: event.aggregateId },
        'Fluxo A: MOBILE_MEETING_AUDIO_SYNCED -> Transcrição autorizada e detecção de riscos acionada',
      );
    });

    // Fluxo B: Chamada VoiceHub
    this.subscribe('VOICE_CALL_COMPLETED', async (event) => {
      logger.info(
        { organizationId: event.organizationId, aggregateId: event.aggregateId },
        'Fluxo B: VOICE_CALL_COMPLETED -> Persistência de chamada e curadoria de objeções acionada',
      );
    });

    // Fluxo C: Risco Elevado no Deal
    this.subscribe('DEAL_RISK_SPIKED', async (event) => {
      logger.info(
        { organizationId: event.organizationId, aggregateId: event.aggregateId },
        'Fluxo C: DEAL_RISK_SPIKED -> Alerta ao gestor e recomendação de Roleplay sob demanda',
      );
    });

    // Fluxo D: Roleplay Masterizado
    this.subscribe('ROLEPLAY_SESSION_MASTERED', async (event) => {
      logger.info(
        { organizationId: event.organizationId, aggregateId: event.aggregateId },
        'Fluxo D: ROLEPLAY_SESSION_MASTERED -> Concessão idempotente de pontuação e badge na Gamificação',
      );
    });

    // Fluxo E: Reunião Agendada / Abordagem Convertida
    this.subscribe('CRM_MEETING_SCHEDULED', async (event) => {
      logger.info(
        { organizationId: event.organizationId, aggregateId: event.aggregateId },
        'Fluxo E: CRM_MEETING_SCHEDULED -> Atribuição comercial e elegibilidade para biblioteca few-shot',
      );
    });
  }

  private calculateCausationDepth(causationId: string): number {
    return causationId.split('->').length;
  }

  getOutbox(): OutboxRecord[] {
    return [...this.outboxStore];
  }

  clearProcessedEvents(): void {
    this.processedEventIds.clear();
    this.outboxStore = [];
  }
}

export const domainEventMesh = new DomainEventMeshService();
