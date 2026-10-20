import type {
  ConsumptionStore,
  NewOutboxRecord,
  OutboxRecord,
  OutboxRepository,
  OutboxUnitOfWork,
} from './outbox.ports.js';

/** Implementação em memória (dev/testes). NÃO é durável — produção deve usar a implementação Prisma. */
export class InMemoryOutboxRepository implements OutboxRepository {
  readonly records = new Map<string, OutboxRecord>();

  async append(input: NewOutboxRecord) {
    if (input.idempotencyKey) {
      for (const r of this.records.values()) {
        if (
          r.organizationId === input.organizationId &&
          r.idempotencyKey === input.idempotencyKey
        ) {
          return { record: r, created: false };
        }
      }
    }
    const record: OutboxRecord = {
      ...input,
      status: 'PENDING',
      retryCount: 0,
      nextAttemptAt: input.createdAt,
    };
    this.records.set(record.id, record);
    return { record, created: true };
  }

  async claimBatch({
    workerId,
    limit,
    now,
    leaseMs,
  }: {
    workerId: string;
    limit: number;
    now: Date;
    leaseMs: number;
  }) {
    const out: OutboxRecord[] = [];
    const sorted = [...this.records.values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    for (const r of sorted) {
      if (out.length >= limit) break;
      const eligible =
        ((r.status === 'PENDING' || r.status === 'FAILED') && new Date(r.nextAttemptAt) <= now) ||
        (r.status === 'PROCESSING' &&
          r.lockedUntil !== undefined &&
          new Date(r.lockedUntil) <= now);
      if (!eligible) continue;
      r.status = 'PROCESSING';
      r.lockedBy = workerId;
      r.lockedUntil = new Date(now.getTime() + leaseMs).toISOString();
      out.push({ ...r });
    }
    return out;
  }

  async markDispatched(id: string, workerId: string, at: Date) {
    const r = this.records.get(id);
    if (!r || (r.lockedBy !== undefined && r.lockedBy !== workerId)) return;
    Object.assign(r, {
      status: 'DISPATCHED',
      dispatchedAt: at.toISOString(),
      lockedBy: undefined,
      lockedUntil: undefined,
    });
  }

  async markFailed(
    id: string,
    workerId: string,
    u: { retryCount: number; nextAttemptAt: Date; lastError: string; deadLetter: boolean },
  ) {
    const r = this.records.get(id);
    if (!r || (r.lockedBy !== undefined && r.lockedBy !== workerId)) return;
    Object.assign(r, {
      status: u.deadLetter ? 'DEAD_LETTER' : 'FAILED',
      retryCount: u.retryCount,
      nextAttemptAt: u.nextAttemptAt.toISOString(),
      lastError: u.lastError,
      lockedBy: undefined,
      lockedUntil: undefined,
    });
  }

  async findById(id: string) {
    const r = this.records.get(id);
    return r ? { ...r } : null;
  }

  clear() {
    this.records.clear();
  }
}

export class InMemoryConsumptionStore implements ConsumptionStore {
  private keys = new Set<string>();
  async has(org: string, eventId: string, consumer: string) {
    return this.keys.has(`${org}:${eventId}:${consumer}`);
  }
  async record(org: string, eventId: string, consumer: string) {
    this.keys.add(`${org}:${eventId}:${consumer}`);
  }
  clear() {
    this.keys.clear();
  }
}

/**
 * Unidade de trabalho em memória com semântica de rollback: as escritas na outbox só são
 * aplicadas se `fn` concluir sem erro (espelha `prisma.$transaction`).
 */
export class InMemoryUnitOfWork implements OutboxUnitOfWork<null> {
  constructor(private readonly target: InMemoryOutboxRepository) {}
  async run<R>(fn: (ctx: { tx: null; outbox: OutboxRepository }) => Promise<R>): Promise<R> {
    const staged = new InMemoryOutboxRepository();
    for (const [k, v] of this.target.records) staged.records.set(k, { ...v });
    const result = await fn({ tx: null, outbox: staged });
    this.target.records.clear();
    for (const [k, v] of staged.records) this.target.records.set(k, v);
    return result;
  }
}
