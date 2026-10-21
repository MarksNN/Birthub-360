import { createHash } from 'node:crypto';
/**
 * REMED-06 — Persistência PostgreSQL da cadeia de consentimento, da outbox de expurgo, dos
 * detalhes expurgáveis e das chaves por titular.
 *
 * DEPENDE DO AGENTE 01: os models `ConsentAuditRecord`, `ConsentAuditChainHead`,
 * `ConsentPurgeTask`, `ConsentEventDetail` e `ConsentSubjectKey` ainda NÃO existem no schema.
 * Os delegates são tipados estruturalmente para compilar antes da migração; a factory
 * (`consentChainFactory.ts`) só usa este repositório quando os delegates existem no client.
 */
import type {
  ChainLockContext,
  ConsentAuditChainRepository,
  ConsentChainEventKind,
  ConsentChainHead,
  ConsentPurgeTask,
  RevocationReasonCode,
  StoredConsentAuditEvent,
} from './consentAuditChain.service.js';
import {
  type SubjectKeyState,
  type SubjectKeyStore,
  SubjectShreddedError,
} from './subjectTokenizer.js';

export interface ConsentAuditRow {
  id: string;
  organizationId: string;
  formatVersion: number;
  sequence: number;
  kind: ConsentChainEventKind;
  subjectRef: string;
  purpose: string;
  termsVersion: string;
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  reasonCode: RevocationReasonCode | null;
  previousHash: string;
  currentHash: string;
  occurredAt: Date;
  operatorUserId: string | null;
  retentionUntil: Date | null;
}

export interface ConsentPurgeTaskRow {
  id: string;
  organizationId: string;
  revocationEventId: string;
  subjectRef: string | null;
  shredSubjectKey: boolean;
  status: 'PENDING' | 'DONE' | 'DEAD';
  attempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  completedAt: Date | null;
  retainUntil: Date | null;
}

type Where = Record<string, unknown>;
interface Delegate<Row> {
  findFirst(args: { where: Where; orderBy?: Record<string, 'asc' | 'desc'> }): Promise<Row | null>;
  findMany(args: {
    where: Where;
    orderBy?: Record<string, 'asc' | 'desc'>;
    take?: number;
  }): Promise<Row[]>;
  create(args: { data: Row }): Promise<unknown>;
  deleteMany(args: { where: Where }): Promise<{ count: number }>;
}
interface HeadRow {
  organizationId: string;
  genesisId: string;
  genesisHash: string;
  lastSequence: number;
  lastHash: string;
}
interface DetailRow {
  eventId: string;
  organizationId: string;
  subjectLookupId: string;
  detail: string;
  retentionUntil?: Date | null;
}
interface KeyRow {
  organizationId: string;
  lookupId: string;
  keyMaterial: Uint8Array;
}
interface TombstoneRow {
  organizationId: string;
  lookupId: string;
  shreddedAt: Date;
}

export interface ConsentChainTx {
  consentAuditRecord: Delegate<ConsentAuditRow>;
  consentAuditChainHead: Delegate<HeadRow> & {
    upsert(args: { where: Where; create: HeadRow; update: Partial<HeadRow> }): Promise<unknown>;
  };
  consentPurgeTask: Delegate<ConsentPurgeTaskRow> & {
    update(args: { where: { id: string }; data: Partial<ConsentPurgeTaskRow> }): Promise<unknown>;
  };
  consentEventDetail: Delegate<DetailRow>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
  $queryRaw<R = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<R>;
}

export interface ConsentChainPrismaLike extends ConsentChainTx {
  $transaction<T>(
    fn: (tx: ConsentChainTx) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T>;
}

/** Grants (#35): Key SELECT/INSERT/DELETE; Tombstone só SELECT (gerado por trigger no DELETE). */
export interface SubjectKeyTx {
  consentSubjectKey: Delegate<KeyRow>;
  consentSubjectKeyTombstone: Pick<Delegate<TombstoneRow>, 'findFirst'>;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}
export interface SubjectKeyPrismaLike {
  $transaction<T>(fn: (tx: SubjectKeyTx) => Promise<T>): Promise<T>;
}

/**
 * Unidade de trabalho (#40 `runInTransaction`): lock, leitura do head, inserts, outbox e purge na
 * MESMA conexão/transação, com tenant setado. Sem runner injetado (testes/client base) usa
 * `db.$transaction` direto.
 */
export type RunInTransaction = <T>(
  fn: (tx: never) => Promise<T>,
  opts: { organizationId: string; maxWaitMs?: number; timeoutMs?: number },
) => Promise<T>;

/**
 * Chave do advisory lock: bigint (64 bits) derivado de sha256('consent-chain:' + orgId) — evita a
 * colisão de 32 bits do `hashtext` (U7). Uma colisão só serializaria tenants a mais, nunca quebraria
 * a corretude: o trigger BEFORE INSERT do #35 é quem garante sequence/previousHash.
 */
export function consentChainLockKey(organizationId: string): string {
  return createHash('sha256')
    .update(`consent-chain:${organizationId}`)
    .digest()
    .readBigInt64BE(0)
    .toString();
}

export const CONSENT_CHAIN_PRISMA_DELEGATES = [
  'consentAuditRecord',
  'consentAuditChainHead',
  'consentPurgeTask',
  'consentEventDetail',
  'consentSubjectKey',
  'consentSubjectKeyTombstone',
] as const;

const toEvent = (r: ConsentAuditRow): StoredConsentAuditEvent => ({
  id: r.id,
  organizationId: r.organizationId,
  formatVersion: r.formatVersion,
  sequence: r.sequence,
  kind: r.kind,
  subjectRef: r.subjectRef,
  purpose: r.purpose,
  termsVersion: r.termsVersion,
  status: r.status,
  reasonCode: r.reasonCode ?? undefined,
  previousHash: r.previousHash,
  currentHash: r.currentHash,
  occurredAt: r.occurredAt.toISOString(),
  operatorUserId: r.operatorUserId ?? undefined,
  retentionUntil: r.retentionUntil?.toISOString(),
});

const toRow = (e: StoredConsentAuditEvent): ConsentAuditRow => ({
  id: e.id,
  organizationId: e.organizationId,
  formatVersion: e.formatVersion,
  sequence: e.sequence,
  kind: e.kind,
  subjectRef: e.subjectRef,
  purpose: e.purpose,
  termsVersion: e.termsVersion,
  status: e.status,
  reasonCode: e.reasonCode ?? null,
  previousHash: e.previousHash,
  currentHash: e.currentHash,
  occurredAt: new Date(e.occurredAt),
  operatorUserId: e.operatorUserId ?? null,
  retentionUntil: e.retentionUntil ? new Date(e.retentionUntil) : null,
});

const toTask = (r: ConsentPurgeTaskRow): ConsentPurgeTask => ({
  id: r.id,
  organizationId: r.organizationId,
  revocationEventId: r.revocationEventId,
  subjectRef: r.subjectRef,
  shredSubjectKey: r.shredSubjectKey,
  status: r.status,
  attempts: r.attempts,
  nextAttemptAt: r.nextAttemptAt.toISOString(),
  lastError: r.lastError ?? undefined,
  completedAt: r.completedAt?.toISOString(),
  retainUntil: r.retainUntil?.toISOString(),
});

const taskRow = (t: ConsentPurgeTask): ConsentPurgeTaskRow => ({
  id: t.id,
  organizationId: t.organizationId,
  revocationEventId: t.revocationEventId,
  subjectRef: t.subjectRef,
  shredSubjectKey: t.shredSubjectKey,
  status: t.status,
  attempts: t.attempts,
  nextAttemptAt: new Date(t.nextAttemptAt),
  lastError: t.lastError ?? null,
  completedAt: t.completedAt ? new Date(t.completedAt) : null,
  retainUntil: t.retainUntil ? new Date(t.retainUntil) : null,
});

export class PrismaConsentAuditChainRepository implements ConsentAuditChainRepository {
  constructor(
    private readonly db: ConsentChainPrismaLike,
    /** Descoberta de organizações (mesmo padrão da outbox REMED-05: Organization via allowlist). */
    private readonly listTenantsFn: () => Promise<string[]>,
    private readonly run?: RunInTransaction,
  ) {}

  private tx<T>(
    organizationId: string,
    fn: (tx: ConsentChainTx) => Promise<T>,
    o: { maxWaitMs?: number; timeoutMs?: number } = {},
  ): Promise<T> {
    if (this.run) return this.run(fn as (tx: never) => Promise<T>, { organizationId, ...o });
    return this.db.$transaction(fn, { maxWait: o.maxWaitMs, timeout: o.timeoutMs });
  }

  async withTenantLock<T>(
    organizationId: string,
    fn: (ctx: ChainLockContext) => Promise<T>,
  ): Promise<T> {
    return this.tx(organizationId, async (tx) => {
      // RLS do PR #35: policy tenant_isolation lê app.current_tenant_id (escopo da transação).
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${consentChainLockKey(organizationId)}::bigint)`;
      const [lastRow, headRow] = await Promise.all([
        tx.consentAuditRecord.findFirst({
          where: { organizationId },
          orderBy: { sequence: 'desc' },
        }),
        tx.consentAuditChainHead.findFirst({ where: { organizationId } }),
      ]);
      return fn({
        last: lastRow ? toEvent(lastRow) : null,
        head: headRow ? { ...headRow } : null,
        append: async (e) => {
          await tx.consentAuditRecord.create({ data: toRow(e) });
        },
        enqueuePurge: async (t) => {
          await tx.consentPurgeTask.create({ data: taskRow(t) });
        },
        saveDetail: async (d) => {
          await tx.consentEventDetail.create({
            data: {
              eventId: d.eventId,
              organizationId: d.organizationId,
              subjectLookupId: d.subjectLookupId,
              detail: d.detail,
              retentionUntil: d.retentionUntil ? new Date(d.retentionUntil) : null,
            },
          });
        },
      });
    });
  }

  private inTenant<T>(organizationId: string, fn: (tx: ConsentChainTx) => Promise<T>): Promise<T> {
    return this.tx(organizationId, async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
      return fn(tx);
    });
  }

  async listChain(organizationId: string): Promise<StoredConsentAuditEvent[]> {
    const rows = await this.inTenant(organizationId, (tx) =>
      tx.consentAuditRecord.findMany({ where: { organizationId }, orderBy: { sequence: 'asc' } }),
    );
    return rows.map(toEvent);
  }

  async getHead(organizationId: string): Promise<ConsentChainHead | null> {
    const h = await this.inTenant(organizationId, (tx) =>
      tx.consentAuditChainHead.findFirst({ where: { organizationId } }),
    );
    return h ? { ...h } : null;
  }

  async listTenants(): Promise<string[]> {
    return this.listTenantsFn();
  }

  async withNextDuePurge(
    organizationId: string,
    now: Date,
    fn: (task: ConsentPurgeTask) => Promise<ConsentPurgeTask>,
  ): Promise<boolean> {
    // Sem bypass de RLS (#35): tenant setado na transação; lock da linha até o commit.
    return this.tx(
      organizationId,
      async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
        const rows = await tx.$queryRaw<ConsentPurgeTaskRow[]>`
          SELECT * FROM "ConsentPurgeTask"
           WHERE "organizationId" = ${organizationId}
             AND status = 'PENDING' AND "nextAttemptAt" <= ${now}
           ORDER BY "nextAttemptAt"
           LIMIT 1
           FOR UPDATE SKIP LOCKED`;
        if (rows.length === 0) return false;
        const { id, ...data } = taskRow(await fn(toTask(rows[0])));
        await tx.consentPurgeTask.update({ where: { id }, data });
        return true;
      },
      { maxWaitMs: 15_000, timeoutMs: 120_000 },
    );
  }

  async deleteExpiredPurges(organizationId: string, now: Date): Promise<number> {
    const r = await this.inTenant(organizationId, (tx) =>
      tx.consentPurgeTask.deleteMany({
        where: { organizationId, status: { in: ['DONE', 'DEAD'] }, retainUntil: { lte: now } },
      }),
    );
    return r.count;
  }

  async deleteDetailsForSubject(organizationId: string, subjectLookupId: string): Promise<number> {
    const r = await this.db.consentEventDetail.deleteMany({
      where: { organizationId, subjectLookupId },
    });
    return r.count;
  }
}

export class PrismaSubjectKeyStore implements SubjectKeyStore {
  constructor(
    private readonly db: SubjectKeyPrismaLike,
    private readonly run?: RunInTransaction,
  ) {}

  private inTenant<T>(organizationId: string, fn: (tx: SubjectKeyTx) => Promise<T>): Promise<T> {
    const body = async (tx: SubjectKeyTx) => {
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
      return fn(tx);
    };
    if (this.run) return this.run(body as (tx: never) => Promise<T>, { organizationId });
    return this.db.$transaction(body);
  }

  async get(organizationId: string, lookupId: string): Promise<SubjectKeyState> {
    return this.inTenant(organizationId, async (tx) => {
      const k = await tx.consentSubjectKey.findFirst({ where: { organizationId, lookupId } });
      if (k) return { status: 'ACTIVE', key: Buffer.from(k.keyMaterial) } as const;
      const t = await tx.consentSubjectKeyTombstone.findFirst({
        where: { organizationId, lookupId },
      });
      return t ? ({ status: 'SHREDDED' } as const) : ({ status: 'ABSENT' } as const);
    });
  }

  async getOrCreate(organizationId: string, lookupId: string, candidate: Buffer): Promise<Buffer> {
    const existing = await this.get(organizationId, lookupId);
    if (existing.status === 'SHREDDED')
      throw new SubjectShreddedError('Titular esquecido: chave destruída');
    if (existing.status === 'ACTIVE') return existing.key;
    try {
      await this.inTenant(organizationId, (tx) =>
        tx.consentSubjectKey.create({ data: { organizationId, lookupId, keyMaterial: candidate } }),
      );
      return candidate;
    } catch (err) {
      const raced = await this.get(organizationId, lookupId);
      if (raced.status === 'ACTIVE') return raced.key;
      if (raced.status === 'SHREDDED')
        throw new SubjectShreddedError('Titular esquecido: chave destruída');
      throw err;
    }
  }

  /** DELETE físico; o trigger do #35 grava ConsentSubjectKeyTombstone (sem material de chave). */
  async destroy(organizationId: string, lookupId: string): Promise<boolean> {
    const r = await this.inTenant(organizationId, (tx) =>
      tx.consentSubjectKey.deleteMany({ where: { organizationId, lookupId } }),
    );
    return r.count > 0;
  }
}
