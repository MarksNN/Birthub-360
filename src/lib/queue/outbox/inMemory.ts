import type {
  AppendOptions,
  ConsumptionStore,
  FailureUpdate,
  NewOutboxRecord,
  OutboxRecord,
  OutboxRef,
  OutboxRepository,
  OutboxUnitOfWork,
} from './outbox.ports.js';

/** Implementação em memória (dev/testes). NÃO é durável — produção deve usar a implementação Prisma. */
export class InMemoryOutboxRepository implements OutboxRepository {
  readonly records = new Map<string, OutboxRecord>();

  async append(input: NewOutboxRecord, opts: AppendOptions = {}) {
    if (input.idempotencyKey) {
      for (const r of this.records.values()) {
        if (
          r.organizationId === input.organizationId &&
          r.idempotencyKey === input.idempotencyKey
        ) {
          return { record: { ...r }, created: false };
        }
      }
    }
    const record: OutboxRecord = {
      ...input,
      status: opts.claimFor ? 'PROCESSING' : 'PENDING',
      retryCount: 0,
      nextAttemptAt: input.createdAt,
      lockedBy: opts.claimFor?.workerId,
      lockedUntil: opts.claimFor
        ? new Date(Date.now() + opts.claimFor.leaseMs).toISOString()
        : undefined,
    };
    this.records.set(record.id, record);
    return { record: { ...record }, created: true };
  }

  async claimBatch({
    workerId,
    limit,
    now,
    leaseMs,
    organizationId,
  }: {
    workerId: string;
    limit: number;
    now: Date;
    leaseMs: number;
    organizationId?: string;
  }) {
    const out: OutboxRecord[] = [];
    const sorted = [...this.records.values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    for (const r of sorted) {
      if (out.length >= limit) break;
      if (organizationId && r.organizationId !== organizationId) continue;
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

  /** Só quem detém o lock pode finalizar (equivale a `WHERE id=$id AND lockedBy=$worker`). */
  private owned(id: string, workerId: string) {
    const r = this.records.get(id);
    return r && r.status === 'PROCESSING' && r.lockedBy === workerId ? r : undefined;
  }

  async markDispatched(ref: OutboxRef, workerId: string, at: Date) {
    const r = this.owned(ref.id, workerId);
    if (!r) return;
    Object.assign(r, {
      status: 'DISPATCHED',
      dispatchedAt: at.toISOString(),
      lockedBy: undefined,
      lockedUntil: undefined,
    });
  }

  async markFailed(ref: OutboxRef, workerId: string, u: FailureUpdate) {
    const r = this.owned(ref.id, workerId);
    if (!r) return;
    Object.assign(r, {
      status: u.deadLetter ? 'DEAD_LETTER' : 'FAILED',
      retryCount: u.retryCount,
      nextAttemptAt: new Date(u.now.getTime() + u.delayMs).toISOString(),
      lastError: u.lastError,
      lockedBy: undefined,
      lockedUntil: undefined,
    });
  }

  async findById(ref: OutboxRef) {
    const r = this.records.get(ref.id);
    return r ? { ...r } : null;
  }

  async requeueDeadLetters({
    organizationId,
    ids,
    now,
  }: {
    organizationId?: string;
    ids?: string[];
    now: Date;
  }) {
    let n = 0;
    for (const r of this.records.values()) {
      if (r.status !== 'DEAD_LETTER') continue;
      if (organizationId && r.organizationId !== organizationId) continue;
      if (ids && !ids.includes(r.id)) continue;
      Object.assign(r, { status: 'PENDING', retryCount: 0, nextAttemptAt: now.toISOString() });
      n++;
    }
    return n;
  }

  async purge({
    retentionMs,
    now,
    statuses,
  }: {
    retentionMs: number;
    now: Date;
    statuses: Array<'DISPATCHED' | 'DEAD_LETTER'>;
  }) {
    const olderThan = new Date(now.getTime() - retentionMs);
    let n = 0;
    for (const [id, r] of this.records) {
      if (!(statuses as string[]).includes(r.status)) continue;
      const ref = r.dispatchedAt ?? r.createdAt;
      if (new Date(ref) < olderThan) {
        this.records.delete(id);
        n++;
      }
    }
    return n;
  }

  clear() {
    this.records.clear();
  }
}

interface Reservation {
  owner: string;
  reservedUntil: number;
  completedAt?: number;
}

export class InMemoryConsumptionStore implements ConsumptionStore {
  private rows = new Map<string, Reservation>();
  private key(o: string, e: string, c: string) {
    return `${o}:${e}:${c}`;
  }

  async reserve(p: {
    organizationId: string;
    eventId: string;
    consumer: string;
    owner: string;
    now: Date;
    leaseMs: number;
  }) {
    const k = this.key(p.organizationId, p.eventId, p.consumer);
    const row = this.rows.get(k);
    if (row && (row.completedAt !== undefined || row.reservedUntil > p.now.getTime())) return false;
    this.rows.set(k, { owner: p.owner, reservedUntil: p.now.getTime() + p.leaseMs });
    return true;
  }

  async complete(p: {
    organizationId: string;
    eventId: string;
    consumer: string;
    owner: string;
    now: Date;
  }) {
    const row = this.rows.get(this.key(p.organizationId, p.eventId, p.consumer));
    if (row && row.owner === p.owner) row.completedAt = p.now.getTime();
  }

  async release(p: { organizationId: string; eventId: string; consumer: string; owner: string }) {
    const k = this.key(p.organizationId, p.eventId, p.consumer);
    const row = this.rows.get(k);
    if (row && row.owner === p.owner && row.completedAt === undefined) this.rows.delete(k);
  }

  async isCompleted(o: string, e: string, c: string) {
    return this.rows.get(this.key(o, e, c))?.completedAt !== undefined;
  }

  clear() {
    this.rows.clear();
  }
}

/**
 * Unidade de trabalho em memória com semântica de rollback: as escritas na outbox só são
 * aplicadas se `fn` concluir sem erro (espelha `prisma.$transaction`). Apenas dev/teste:
 * aplica só os registros novos/alterados dentro da UoW, sem sobrescrever o restante.
 */
export class InMemoryUnitOfWork implements OutboxUnitOfWork<null> {
  constructor(private readonly target: InMemoryOutboxRepository) {}
  async run<R>(fn: (ctx: { tx: null; outbox: OutboxRepository }) => Promise<R>): Promise<R> {
    const staged = new InMemoryOutboxRepository();
    for (const [k, v] of this.target.records) staged.records.set(k, { ...v });
    const before = new Set(this.target.records.keys());
    const result = await fn({ tx: null, outbox: staged });
    for (const [k, v] of staged.records) if (!before.has(k)) this.target.records.set(k, v);
    return result;
  }
}
