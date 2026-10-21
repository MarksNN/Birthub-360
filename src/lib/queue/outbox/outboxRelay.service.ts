import { randomUUID } from 'node:crypto';
import type { DomainEventEnvelope } from '../../../shared/contracts/domainEventMesh.contract.js';
import { logger } from '../../logger.js';
import { type BackoffPolicy, computeBackoffMs, DEFAULT_BACKOFF } from './backoff.js';
import {
  outboxDeadLetterTotal,
  outboxPurgedTotal,
  outboxRequeuedTotal,
  sanitizeError,
} from './metrics.js';
import {
  DEFAULT_RETENTION,
  type OutboxRecord,
  type OutboxRepository,
  type RetentionPolicy,
} from './outbox.ports.js';

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
  private ticking = false;

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
      await this.opts.repository.markDispatched(record, this.workerId, now);
      return 'DISPATCHED';
    } catch (err) {
      const maxAttempts = record.maxAttempts || policy.maxAttempts;
      // CHECK do #34: retryCount <= maxAttempts — nunca incrementa além do limite.
      const retryCount = Math.min(record.retryCount + 1, maxAttempts);
      const deadLetter = retryCount >= maxAttempts;
      const delay = computeBackoffMs(retryCount, policy, this.opts.random);
      const lastError = sanitizeError(err);
      await this.opts.repository.markFailed(record, this.workerId, {
        retryCount,
        delayMs: delay,
        now,
        lastError,
        deadLetter,
      });
      if (deadLetter) outboxDeadLetterTotal.inc({ organization: record.organizationId });
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
  /**
   * Processa um lote por tenant. Concorrência limitada por desenho (parecer 15, U4): um relay nunca
   * roda dois ticks ao mesmo tempo, percorre os tenants em série e cada operação usa UMA conexão
   * por vez (claim, entrega e marcação em transações curtas e separadas, nenhuma aninhada).
   */
  async tick(): Promise<number> {
    if (this.ticking) return 0;
    this.ticking = true;
    try {
      return await this.tickOnce();
    } finally {
      this.ticking = false;
    }
  }

  private async tickOnce(): Promise<number> {
    const now = (this.opts.now ?? (() => new Date()))();
    const repo = this.opts.repository;
    // Com RLS estrita, o relay itera por tenant e cada claim roda com o contexto da organização.
    const tenants: Array<string | undefined> = repo.listTenants
      ? await repo.listTenants()
      : [undefined];
    let total = 0;
    for (const organizationId of tenants) {
      try {
        const batch = await repo.claimBatch({
          workerId: this.workerId,
          limit: this.opts.batchSize ?? 50,
          now,
          leaseMs: this.opts.leaseMs ?? 30_000,
          organizationId,
        });
        for (const record of batch) await this.processRecord(record, now);
        total += batch.length;
      } catch (err) {
        logger.error({ err, organizationId }, 'OutboxRelay: falha ao processar tenant');
      }
    }
    return total;
  }

  /** Reprocessamento da DLQ (operação administrativa). */
  async requeueDeadLetters(
    filter: { organizationId?: string; ids?: string[] } = {},
  ): Promise<number> {
    const n = await this.opts.repository.requeueDeadLetters({
      ...filter,
      now: (this.opts.now ?? (() => new Date()))(),
    });
    if (n > 0) outboxRequeuedTotal.inc({ organization: filter.organizationId ?? 'all' }, n);
    logger.info({ ...filter, requeued: n }, 'OutboxRelay: DLQ reenfileirada');
    return n;
  }

  /**
   * Retenção/LGPD: delega à função SQL `domain_event_outbox_purge` (por tenant). Prazos provisórios
   * do 01 (DISPATCHED 30d, DLQ 90d, consumo 30d) até confirmação do 01A.
   */
  async purgeExpired(policy: Partial<Omit<RetentionPolicy, 'now'>> = {}): Promise<number> {
    const now = (this.opts.now ?? (() => new Date()))();
    const n = await this.opts.repository.purge({ ...DEFAULT_RETENTION, ...policy, now });
    if (n > 0) outboxPurgedTotal.inc({ organization: 'all' }, n);
    return n;
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
