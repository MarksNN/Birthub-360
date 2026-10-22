/**
 * REMED-05 — Adaptadores Postgres/Prisma da outbox e do consumo.
 *
 * Depende das tabelas `DomainEventOutbox`/`DomainEventConsumption` da migração
 * `20261020210000_remed05_domain_event_outbox` (Agente 01, PR #34). Regras do 01 aplicadas:
 * - claim com CTE `WITH due AS (... FOR UPDATE SKIP LOCKED) UPDATE ... FROM due` (respeita o LIMIT);
 * - RLS estrita: toda query roda num `SqlExecutor` com `app.current_tenant_id` da organização;
 *   o relay itera por tenant (`listTenants`), sem role BYPASSRLS;
 * - timestamps sempre com `now()` do Postgres (nunca default do Prisma nem `Date` do Node).
 */
import type {
  DomainEventEnvelope,
  DomainEventType,
} from '../../../shared/contracts/domainEventMesh.contract.js';
import type {
  AppendOptions,
  ConsumptionStore,
  FailureUpdate,
  NewOutboxRecord,
  OutboxRecord,
  OutboxRef,
  OutboxRepository,
  OutboxStatus,
  OutboxUnitOfWork,
  RetentionPolicy,
} from './outbox.ports.js';

/** Subconjunto do `Prisma.TransactionClient` usado aqui (facilita testes com `pg`). */
export interface SqlExecutor {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
}

/** Executa `fn` numa transação com o contexto RLS da organização. */
export interface TenantSqlRunner {
  runAsTenant<T>(organizationId: string, fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  /** Descoberta de tenants (ex.: `Organization` via allowlist de bypass já existente). */
  listTenants(): Promise<string[]>;
}

const T = '"DomainEventOutbox"';
const C = '"DomainEventConsumption"';

interface OutboxRow {
  id: string;
  organizationId: string;
  eventId: string;
  eventType: string;
  idempotencyKey: string | null;
  envelope: unknown;
  status: OutboxStatus;
  retryCount: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lockedBy: string | null;
  lockedUntil: Date | null;
  lastError: string | null;
  createdAt: Date;
  dispatchedAt: Date | null;
}

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : undefined);

function toRecord(r: OutboxRow): OutboxRecord {
  const envelope = (
    typeof r.envelope === 'string' ? JSON.parse(r.envelope) : r.envelope
  ) as DomainEventEnvelope;
  return {
    id: r.id,
    organizationId: r.organizationId,
    eventId: r.eventId,
    eventType: r.eventType as DomainEventType,
    idempotencyKey: r.idempotencyKey ?? undefined,
    envelope,
    payload: (envelope?.payload ?? {}) as Record<string, unknown>,
    status: r.status,
    retryCount: Number(r.retryCount),
    maxAttempts: Number(r.maxAttempts),
    nextAttemptAt: iso(r.nextAttemptAt) as string,
    lockedBy: r.lockedBy ?? undefined,
    lockedUntil: iso(r.lockedUntil),
    lastError: r.lastError ?? undefined,
    createdAt: iso(r.createdAt) as string,
    dispatchedAt: iso(r.dispatchedAt),
  };
}

async function appendSql(tx: SqlExecutor, rec: NewOutboxRecord, opts: AppendOptions = {}) {
  const e = rec.envelope;
  const lease = opts.claimFor ? opts.claimFor.leaseMs : null;
  const rows = await tx.$queryRawUnsafe<OutboxRow[]>(
    `INSERT INTO ${T} ("id","organizationId","eventId","eventType","eventVersion","aggregateId","correlationId",
       "causationId","producer","idempotencyKey","envelope","status","retryCount","maxAttempts","nextAttemptAt",
       "lockedBy","lockedUntil","createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,
       (CASE WHEN $13::int IS NULL THEN 'PENDING' ELSE 'PROCESSING' END)::"DomainEventOutboxStatus",
       0,$12::int, now(), $14,
       CASE WHEN $13::int IS NULL THEN NULL ELSE now() + ($13::int * interval '1 millisecond') END, now())
     -- Cobre os dois únicos do #34 @671d8d31: (organizationId, eventId) e o parcial (organizationId, idempotencyKey).
     ON CONFLICT DO NOTHING
     RETURNING *`,
    rec.id,
    rec.organizationId,
    rec.eventId,
    rec.eventType,
    e.eventVersion ?? '1.0.0',
    e.aggregateId,
    e.correlationId,
    e.causationId ?? null,
    e.producer,
    rec.idempotencyKey ?? null,
    JSON.stringify(e),
    rec.maxAttempts,
    lease,
    opts.claimFor?.workerId ?? null,
  );
  if (rows.length > 0) return { record: toRecord(rows[0]), created: true };
  // Conflito: devolve o registro existente do MESMO tenant (eventId é único por organização).
  const existing = rec.idempotencyKey
    ? await tx.$queryRawUnsafe<OutboxRow[]>(
        `SELECT * FROM ${T} WHERE "organizationId"=$1 AND ("idempotencyKey"=$2 OR "eventId"=$3)
          ORDER BY ("idempotencyKey"=$2) DESC LIMIT 1`,
        rec.organizationId,
        rec.idempotencyKey,
        rec.eventId,
      )
    : await tx.$queryRawUnsafe<OutboxRow[]>(
        `SELECT * FROM ${T} WHERE "organizationId"=$1 AND "eventId"=$2 LIMIT 1`,
        rec.organizationId,
        rec.eventId,
      );
  if (!existing[0]) throw new Error('DomainEventOutbox: conflito sem registro visível no tenant');
  return { record: toRecord(existing[0]), created: false };
}

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly runner: TenantSqlRunner) {}

  /** Repositório ligado à transação do caso de uso (já com contexto RLS do tenant). */
  static forTransaction(tx: SqlExecutor): OutboxRepository {
    const unsupported = () => {
      throw new Error(
        'PrismaOutboxRepository.forTransaction: apenas append é suportado dentro do caso de uso',
      );
    };
    return {
      append: (rec, opts) => appendSql(tx, rec, opts),
      claimBatch: unsupported,
      markDispatched: unsupported,
      markFailed: unsupported,
      findById: unsupported,
      requeueDeadLetters: unsupported,
      purge: unsupported,
    };
  }

  append(rec: NewOutboxRecord, opts?: AppendOptions) {
    return this.runner.runAsTenant(rec.organizationId, (tx) => appendSql(tx, rec, opts));
  }

  listTenants() {
    return this.runner.listTenants();
  }

  async claimBatch(p: {
    workerId: string;
    limit: number;
    now: Date;
    leaseMs: number;
    organizationId?: string;
  }) {
    if (!p.organizationId)
      throw new Error('PrismaOutboxRepository.claimBatch exige organizationId (RLS)');
    const rows = await this.runner.runAsTenant(p.organizationId, (tx) =>
      tx.$queryRawUnsafe<OutboxRow[]>(
        `WITH due AS (
           SELECT "id" FROM ${T}
            WHERE "organizationId" = $1
              AND (("status" IN ('PENDING','FAILED') AND "nextAttemptAt" <= now())
                OR ("status" = 'PROCESSING' AND "lockedUntil" <= now()))
            ORDER BY "nextAttemptAt"
            LIMIT $2::int
            FOR UPDATE SKIP LOCKED)
         UPDATE ${T} t
            SET "status" = 'PROCESSING', "lockedBy" = $3, "lockedUntil" = now() + ($4::int * interval '1 millisecond')
           FROM due
          WHERE t."id" = due."id"
         RETURNING t.*`,
        p.organizationId,
        p.limit,
        p.workerId,
        p.leaseMs,
      ),
    );
    return rows.map(toRecord);
  }

  async markDispatched(ref: OutboxRef, workerId: string) {
    await this.runner.runAsTenant(ref.organizationId, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE ${T} SET "status"='DISPATCHED', "dispatchedAt"=now(), "lockedBy"=NULL, "lockedUntil"=NULL
          WHERE "id"=$1 AND "status"='PROCESSING' AND "lockedBy"=$2`,
        ref.id,
        workerId,
      ),
    );
  }

  async markFailed(ref: OutboxRef, workerId: string, u: FailureUpdate) {
    await this.runner.runAsTenant(ref.organizationId, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE ${T} SET "status"=$3::"DomainEventOutboxStatus", "retryCount"=$4::int,
            "nextAttemptAt"= now() + ($5::int * interval '1 millisecond'), "lastError"=$6,
            "lockedBy"=NULL, "lockedUntil"=NULL
          WHERE "id"=$1 AND "status"='PROCESSING' AND "lockedBy"=$2`,
        ref.id,
        workerId,
        u.deadLetter ? 'DEAD_LETTER' : 'FAILED',
        u.retryCount,
        Math.max(0, Math.floor(u.delayMs)),
        u.lastError,
      ),
    );
  }

  async findById(ref: OutboxRef) {
    const rows = await this.runner.runAsTenant(ref.organizationId, (tx) =>
      tx.$queryRawUnsafe<OutboxRow[]>(`SELECT * FROM ${T} WHERE "id"=$1`, ref.id),
    );
    return rows[0] ? toRecord(rows[0]) : null;
  }

  async requeueDeadLetters(f: { organizationId?: string; ids?: string[] }) {
    const tenants = f.organizationId ? [f.organizationId] : await this.runner.listTenants();
    let n = 0;
    for (const org of tenants) {
      n += await this.runner.runAsTenant(org, (tx) =>
        tx.$executeRawUnsafe(
          `UPDATE ${T} SET "status"='PENDING', "retryCount"=0, "nextAttemptAt"=now(), "lockedBy"=NULL, "lockedUntil"=NULL
            WHERE "status"='DEAD_LETTER' AND "organizationId"=$1 AND ($2::text[] IS NULL OR "id" = ANY($2::text[]))`,
          org,
          f.ids ?? null,
        ),
      );
    }
    return n;
  }

  /** Retenção via função SQL do 01 (`domain_event_outbox_purge`), por tenant e com o tenant setado. */
  async purge(p: RetentionPolicy) {
    let n = 0;
    for (const org of await this.runner.listTenants()) {
      const [r] = await this.runner.runAsTenant(org, (tx) =>
        tx.$queryRawUnsafe<
          Array<{
            dispatched_deleted: string | number;
            dead_letter_deleted: string | number;
            consumption_deleted: string | number;
          }>
        >(
          'SELECT * FROM domain_event_outbox_purge($1, $2::int, $3::int, $4::int)',
          org,
          p.dispatchedDays,
          p.deadLetterDays,
          p.consumptionDays,
        ),
      );
      n +=
        Number(r?.dispatched_deleted ?? 0) +
        Number(r?.dead_letter_deleted ?? 0) +
        Number(r?.consumption_deleted ?? 0);
    }
    return n;
  }
}

/**
 * Consumo durável com lease (#34 @eaf0d4e7: reservedBy/reservedUntil/completedAt).
 * - reserve: INSERT ... ON CONFLICT DO UPDATE que só retoma o lease se a linha não foi concluída e o
 *   lease expirou (`completedAt IS NULL AND reservedUntil < now()`); grava sempre reservedBy e
 *   reservedUntil = now() + ttl.
 * - complete: completedAt = now() (e processedAt), apenas pelo dono do lease.
 * - release (falha): apaga a linha não concluída do dono → próxima entrega reserva de novo.
 * - "já processado" = completedAt IS NOT NULL.
 * Todos os horários vêm do now() do Postgres.
 */
export class PrismaConsumptionStore implements ConsumptionStore {
  constructor(private readonly runner: TenantSqlRunner) {}

  async reserve(p: {
    organizationId: string;
    eventId: string;
    consumer: string;
    owner: string;
    leaseMs: number;
  }) {
    const rows = await this.runner.runAsTenant(p.organizationId, (tx) =>
      tx.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO ${C} AS c ("organizationId","eventId","consumer","processedAt","reservedBy","reservedUntil")
         VALUES ($1,$2,$3, now(), $4, now() + ($5::int * interval '1 millisecond'))
         ON CONFLICT ("organizationId","eventId","consumer") DO UPDATE
            SET "reservedBy" = EXCLUDED."reservedBy", "reservedUntil" = EXCLUDED."reservedUntil"
          WHERE c."completedAt" IS NULL AND (c."reservedUntil" IS NULL OR c."reservedUntil" < now())
         RETURNING c."id"`,
        p.organizationId,
        p.eventId,
        p.consumer,
        p.owner,
        Math.max(1, Math.floor(p.leaseMs)),
      ),
    );
    return rows.length > 0;
  }

  async complete(p: { organizationId: string; eventId: string; consumer: string; owner: string }) {
    await this.runner.runAsTenant(p.organizationId, (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE ${C} SET "completedAt"=now(), "processedAt"=now(), "reservedUntil"=NULL
          WHERE "organizationId"=$1 AND "eventId"=$2 AND "consumer"=$3 AND "reservedBy"=$4 AND "completedAt" IS NULL`,
        p.organizationId,
        p.eventId,
        p.consumer,
        p.owner,
      ),
    );
  }

  async release(p: { organizationId: string; eventId: string; consumer: string; owner: string }) {
    await this.runner.runAsTenant(p.organizationId, (tx) =>
      tx.$executeRawUnsafe(
        `DELETE FROM ${C}
          WHERE "organizationId"=$1 AND "eventId"=$2 AND "consumer"=$3 AND "reservedBy"=$4 AND "completedAt" IS NULL`,
        p.organizationId,
        p.eventId,
        p.consumer,
        p.owner,
      ),
    );
  }

  async isCompleted(organizationId: string, eventId: string, consumer: string) {
    const rows = await this.runner.runAsTenant(organizationId, (tx) =>
      tx.$queryRawUnsafe<unknown[]>(
        `SELECT 1 FROM ${C} WHERE "organizationId"=$1 AND "eventId"=$2 AND "consumer"=$3 AND "completedAt" IS NOT NULL`,
        organizationId,
        eventId,
        consumer,
      ),
    );
    return rows.length > 0;
  }
}

/** Unidade de trabalho: o caso de uso escreve seus dados e a outbox na MESMA transação do tenant. */
export class PrismaOutboxUnitOfWork<TTx extends SqlExecutor = SqlExecutor>
  implements OutboxUnitOfWork<TTx>
{
  constructor(private readonly transaction: <R>(fn: (tx: TTx) => Promise<R>) => Promise<R>) {}
  run<R>(fn: (ctx: { tx: TTx; outbox: OutboxRepository }) => Promise<R>): Promise<R> {
    return this.transaction((tx) => fn({ tx, outbox: PrismaOutboxRepository.forTransaction(tx) }));
  }
}
