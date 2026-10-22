import { randomUUID } from 'node:crypto';
import type {
  DomainEventEnvelope,
  DomainEventType,
  IDomainEventMeshPort,
} from '../../shared/contracts/domainEventMesh.contract.js';
import { logger } from '../logger.js';
import { type BackoffPolicy, computeBackoffMs, DEFAULT_BACKOFF } from './outbox/backoff.js';
import { InMemoryConsumptionStore, InMemoryOutboxRepository } from './outbox/inMemory.js';
import { sanitizeError } from './outbox/metrics.js';
import type {
  ConsumptionStore,
  OutboxRecord,
  OutboxRepository,
  OutboxUnitOfWork,
} from './outbox/outbox.ports.js';
import { OutboxRelay, type OutboxRelayOptions } from './outbox/outboxRelay.service.js';

export type { OutboxRecord } from './outbox/outbox.ports.js';

type Handler = (event: DomainEventEnvelope) => Promise<void>;
type PublishInput<T> = Omit<DomainEventEnvelope<T>, 'eventId' | 'occurredAt'>;

export interface PublishOptions {
  /** Chave de idempotência do produtor; republicar com a mesma chave não gera novo evento. */
  idempotencyKey?: string;
  maxAttempts?: number;
}

export interface DomainEventMeshDeps {
  outbox?: OutboxRepository;
  consumptions?: ConsumptionStore;
  backoff?: BackoffPolicy;
}

export class DomainEventMeshService implements IDomainEventMeshPort {
  private handlers = new Map<DomainEventType, Array<{ consumer: string; handler: Handler }>>();
  private outbox: OutboxRepository;
  private consumptions: ConsumptionStore;
  private backoff: BackoffPolicy;
  private static MAX_CAUSATION_DEPTH = 5;
  private static INLINE_LEASE_MS = 30_000;
  private static CONSUMER_LEASE_MS = 60_000;

  constructor(deps: DomainEventMeshDeps = {}) {
    this.outbox = deps.outbox ?? new InMemoryOutboxRepository();
    this.consumptions = deps.consumptions ?? new InMemoryConsumptionStore();
    this.backoff = deps.backoff ?? DEFAULT_BACKOFF;
    this.registerDefaultFlows();
  }

  /** Troca os adaptadores (ex.: Prisma em produção, quando o Agente 01 entregar as tabelas). */
  configure(deps: DomainEventMeshDeps): void {
    if (deps.outbox) this.outbox = deps.outbox;
    if (deps.consumptions) this.consumptions = deps.consumptions;
    if (deps.backoff) this.backoff = deps.backoff;
  }

  private buildEnvelope<T>(eventInput: PublishInput<T>): DomainEventEnvelope<T> {
    if (!eventInput.organizationId || eventInput.organizationId.trim() === '') {
      throw new Error('Tenancy violation: Evento rejeitado por ausência de organizationId');
    }
    const envelope: DomainEventEnvelope<T> = {
      ...eventInput,
      eventId: `evt-${randomUUID()}`,
      occurredAt: new Date().toISOString(),
      eventVersion: eventInput.eventVersion || '1.0.0',
    };
    if (
      envelope.causationId &&
      this.calculateCausationDepth(envelope.causationId) >=
        DomainEventMeshService.MAX_CAUSATION_DEPTH
    ) {
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
    return envelope;
  }

  private async appendTo<T>(
    repo: OutboxRepository,
    envelope: DomainEventEnvelope<T>,
    opts: PublishOptions,
    claimFor?: { workerId: string; leaseMs: number },
  ) {
    return repo.append(
      {
        id: `outbox-${randomUUID()}`,
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        organizationId: envelope.organizationId,
        idempotencyKey: opts.idempotencyKey,
        envelope: envelope as unknown as DomainEventEnvelope,
        payload: envelope.payload as Record<string, unknown>,
        maxAttempts: opts.maxAttempts ?? this.backoff.maxAttempts,
        createdAt: envelope.occurredAt,
      },
      claimFor ? { claimFor } : undefined,
    );
  }

  /**
   * Grava o evento na outbox usando o repositório transacional do caso de uso (mesma transação).
   * Não despacha: o OutboxRelay entrega após o commit. Se a transação fizer rollback, o evento some junto.
   */
  async publishInTransaction<T = Record<string, unknown>>(
    txOutbox: OutboxRepository,
    eventInput: PublishInput<T>,
    opts: PublishOptions = {},
  ): Promise<DomainEventEnvelope<T>> {
    const envelope = this.buildEnvelope(eventInput);
    const { record } = await this.appendTo(txOutbox, envelope, opts);
    return record.envelope as unknown as DomainEventEnvelope<T>;
  }

  /** Executa o caso de uso numa unidade de trabalho que expõe `tx` e a outbox transacional. */
  async withTransaction<TTx, R>(
    uow: OutboxUnitOfWork<TTx>,
    fn: (ctx: {
      tx: TTx;
      publish: <T>(e: PublishInput<T>, o?: PublishOptions) => Promise<DomainEventEnvelope<T>>;
    }) => Promise<R>,
  ): Promise<R> {
    return uow.run(({ tx, outbox }) =>
      fn({ tx, publish: (e, o) => this.publishInTransaction(outbox, e, o) }),
    );
  }

  /**
   * Publica fora de transação de negócio: grava na outbox e tenta entrega imediata.
   * Em falha, o registro fica FAILED com backoff e o relay reprocessa; o erro é propagado.
   */
  async publish<T = Record<string, unknown>>(
    eventInput: PublishInput<T>,
    opts: PublishOptions = {},
  ): Promise<DomainEventEnvelope<T>> {
    const envelope = this.buildEnvelope(eventInput);
    // Grava já reivindicado: um relay concorrente não pega o registro durante a entrega inline.
    const inlineWorker = `inline-${randomUUID()}`;
    const { record, created } = await this.appendTo(this.outbox, envelope, opts, {
      workerId: inlineWorker,
      leaseMs: DomainEventMeshService.INLINE_LEASE_MS,
    });
    if (!created) return record.envelope as unknown as DomainEventEnvelope<T>;

    logger.info(
      {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        organizationId: envelope.organizationId,
        correlationId: envelope.correlationId,
      },
      `DomainEventMesh: Evento publicado [${envelope.eventType}]`,
    );

    try {
      await this.deliver(record.envelope);
      await this.outbox.markDispatched(record, inlineWorker, new Date());
    } catch (err) {
      const retryCount = 1;
      await this.outbox.markFailed(record, inlineWorker, {
        retryCount,
        delayMs: computeBackoffMs(retryCount, this.backoff),
        now: new Date(),
        lastError: sanitizeError(err),
        deadLetter: retryCount >= record.maxAttempts,
      });
      throw err;
    }
    return envelope;
  }

  /** Registra um handler. `consumer` identifica o consumidor para idempotência durável. */
  subscribe(eventType: DomainEventType, handler: Handler, consumer?: string): void {
    const current = this.handlers.get(eventType) || [];
    current.push({ consumer: consumer ?? `${eventType}#${current.length}`, handler });
    this.handlers.set(eventType, current);
  }

  /**
   * Entrega a todos os consumidores com reserva atômica por (org, eventId, consumer):
   * reserva (insert-if-absent) → handler → complete; em falha, libera a reserva para retry.
   * Consumidores já concluídos ou reservados por outra instância são pulados.
   * Ver garantias e o caso at-least-once residual em `ConsumptionStore` (outbox.ports.ts).
   */
  async deliver(event: DomainEventEnvelope): Promise<void> {
    const owner = `deliver-${randomUUID()}`;
    const key = { organizationId: event.organizationId, eventId: event.eventId };
    for (const { consumer, handler } of this.handlers.get(event.eventType) || []) {
      const reserved = await this.consumptions.reserve({
        ...key,
        consumer,
        owner,
        now: new Date(),
        leaseMs: DomainEventMeshService.CONSUMER_LEASE_MS,
      });
      if (!reserved) {
        if (await this.consumptions.isCompleted(event.organizationId, event.eventId, consumer))
          continue;
        throw new Error(`DomainEventMesh: consumidor ${consumer} em execução por outra instância`);
      }
      try {
        await handler(event);
      } catch (err) {
        await this.consumptions.release({ ...key, consumer, owner });
        logger.error(
          {
            err,
            eventId: event.eventId,
            eventType: event.eventType,
            organizationId: event.organizationId,
            consumer,
          },
          'DomainEventMesh: Erro ao executar handler de evento assíncrono',
        );
        throw err;
      }
      await this.consumptions.complete({ ...key, consumer, owner, now: new Date() });
    }
  }

  /** Cria um relay ligado a este mesh (para o entrypoint de workers). */
  createRelay(opts: Omit<OutboxRelayOptions, 'repository' | 'dispatcher'> = {}): OutboxRelay {
    return new OutboxRelay({
      backoff: this.backoff,
      ...opts,
      repository: this.outbox,
      dispatcher: (e) => this.deliver(e),
    });
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

  /** Snapshot da outbox (apenas quando o adaptador é em memória). */
  getOutbox(): OutboxRecord[] {
    return this.outbox instanceof InMemoryOutboxRepository
      ? [...this.outbox.records.values()].map((r) => ({ ...r }))
      : [];
  }

  getOutboxRecords(): OutboxRecord[] {
    return this.getOutbox();
  }

  clearProcessedEvents(): void {
    if (this.consumptions instanceof InMemoryConsumptionStore) this.consumptions.clear();
    if (this.outbox instanceof InMemoryOutboxRepository) this.outbox.clear();
  }
}

export const domainEventMesh = new DomainEventMeshService();
