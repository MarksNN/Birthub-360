import { randomUUID } from 'node:crypto';
import type { DomainEventEnvelope } from '../../../shared/contracts/domainEventMesh.contract.js';
import { logger } from '../../logger.js';
import { type BackoffPolicy, computeBackoffMs, DEFAULT_BACKOFF } from './backoff.js';
import type { OutboxRecord, OutboxRepository } from './outbox.ports.js';

export type OutboxDispatcher = (
  envelope: DomainEventEnvelope,
  record: OutboxRecord,
) => Promise<void>;

export interface OutboxRelayOptions {
  repository: OutboxRepository;
  dispatcher: OutboxDispatcher;
  backoff?: BackoffPolicy;
  batchSize?: number;
  leaseMs?: number;
  workerId?: string;
  now?: () => Date;
  random?: () => number;
}

/**
 * Relay da outbox: reivindica lotes com lease (seguro para N réplicas), despacha,
 * reagenda falhas com backoff exponencial + jitter e move para DEAD_LETTER ao esgotar tentativas.
 */
export class OutboxRelay {
  readonly workerId: string;
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly opts: OutboxRelayOptions) {
    this.workerId = opts.workerId ?? `relay-${randomUUID()}`;
  }

  async processRecord(
    record: OutboxRecord,
    now = (this.opts.now ?? (() => new Date()))(),
  ): Promise<'DISPATCHED' | 'FAILED' | 'DEAD_LETTER'> {
    const policy = this.opts.backoff ?? DEFAULT_BACKOFF;
    try {
      await this.opts.dispatcher(record.envelope, record);
      await this.opts.repository.markDispatched(record.id, this.workerId, now);
      return 'DISPATCHED';
    } catch (err) {
      const retryCount = record.retryCount + 1;
      const maxAttempts = record.maxAttempts || policy.maxAttempts;
      const deadLetter = retryCount >= maxAttempts;
      const delay = computeBackoffMs(retryCount, policy, this.opts.random);
      const lastError = (err instanceof Error ? err.message : String(err)).slice(0, 2000);
      await this.opts.repository.markFailed(record.id, this.workerId, {
        retryCount,
        nextAttemptAt: new Date(now.getTime() + delay),
        lastError,
        deadLetter,
      });
      logger[deadLetter ? 'error' : 'warn'](
        {
          outboxId: record.id,
          eventId: record.eventId,
          eventType: record.eventType,
          organizationId: record.organizationId,
          retryCount,
          deadLetter,
        },
        deadLetter
          ? 'OutboxRelay: evento movido para DEAD_LETTER'
          : 'OutboxRelay: falha no despacho, reagendado com backoff',
      );
      return deadLetter ? 'DEAD_LETTER' : 'FAILED';
    }
  }

  /** Processa um lote; retorna quantos registros foram reivindicados. */
  async tick(): Promise<number> {
    const now = (this.opts.now ?? (() => new Date()))();
    const batch = await this.opts.repository.claimBatch({
      workerId: this.workerId,
      limit: this.opts.batchSize ?? 50,
      now,
      leaseMs: this.opts.leaseMs ?? 30_000,
    });
    for (const record of batch) await this.processRecord(record, now);
    return batch.length;
  }

  start(intervalMs = 1_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = true;
      this.tick()
        .catch((err) => logger.error({ err }, 'OutboxRelay: erro no tick'))
        .finally(() => {
          this.running = false;
        });
    }, intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
}
