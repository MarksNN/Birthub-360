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
  leaseOwner: string | null;
  leasedUntil: Date | null;
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
}
interface KeyRow {
  organizationId: string;
  lookupId: string;
  keyMaterial: Uint8Array | null;
  shreddedAt: Date | null;
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
  $transaction<T>(fn: (tx: ConsentChainTx) => Promise<T>): Promise<T>;
}

export interface SubjectKeyPrismaLike {
  consentSubjectKey: Delegate<KeyRow> & {
    updateMany(args: { where: Where; data: Partial<KeyRow> }): Promise<{ count: number }>;
  };
}

export const CONSENT_CHAIN_PRISMA_DELEGATES = [
  'consentAuditRecord',
  'consentAuditChainHead',
  'consentPurgeTask',
  'consentEventDetail',
  'consentSubjectKey',
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
  leaseOwner: r.leaseOwner,
  leasedUntil: r.leasedUntil?.toISOString() ?? null,
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
  leaseOwner: t.leaseOwner ?? null,
  leasedUntil: t.leasedUntil ? new Date(t.leasedUntil) : null,
  lastError: t.lastError ?? null,
  completedAt: t.completedAt ? new Date(t.completedAt) : null,
  retainUntil: t.retainUntil ? new Date(t.retainUntil) : null,
});

export class PrismaConsentAuditChainRepository implements ConsentAuditChainRepository {
  constructor(private readonly db: ConsentChainPrismaLike) {}

  async withTenantLock<T>(
    organizationId: string,
    fn: (ctx: ChainLockContext) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      // RLS do PR #35: policy tenant_isolation lê app.current_tenant_id (escopo da transação).
      await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${organizationId}, TRUE)`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('consent-chain:' || ${organizationId}))`;
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
        setHead: async (h: ConsentChainHead) => {
          await tx.consentAuditChainHead.upsert({
            where: { organizationId: h.organizationId },
            create: { ...h },
            update: { lastSequence: h.lastSequence, lastHash: h.lastHash },
          });
        },
        enqueuePurge: async (t) => {
          await tx.consentPurgeTask.create({ data: taskRow(t) });
        },
        saveDetail: async (d) => {
          await tx.consentEventDetail.create({ data: { ...d } });
        },
      });
    });
  }

  private inTenant<T>(organizationId: string, fn: (tx: ConsentChainTx) => Promise<T>): Promise<T> {
    return this.db.$transaction(async (tx) => {
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

  async claimDuePurges(
    now: Date,
    limit: number,
    owner: string,
    leaseMs: number,
  ): Promise<ConsentPurgeTask[]> {
    const until = new Date(now.getTime() + leaseMs);
    // Worker cross-tenant: exige policy que aceite app.bypass_rls (pedido ao Agente 01).
    const rows = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.bypass_rls', 'on', TRUE)`;
      return tx.$queryRaw<ConsentPurgeTaskRow[]>`
        UPDATE "ConsentPurgeTask" t
           SET "leaseOwner" = ${owner}, "leasedUntil" = ${until}
         WHERE t.id IN (
           SELECT id FROM "ConsentPurgeTask"
            WHERE status = 'PENDING' AND "nextAttemptAt" <= ${now}
              AND ("leasedUntil" IS NULL OR "leasedUntil" <= ${now})
            ORDER BY "nextAttemptAt"
            LIMIT ${limit}
            FOR UPDATE SKIP LOCKED)
        RETURNING t.*`;
    });
    return rows.map(toTask);
  }

  async updatePurge(task: ConsentPurgeTask): Promise<void> {
    const { id, ...data } = taskRow(task);
    await this.db.consentPurgeTask.update({ where: { id }, data });
  }

  async deleteExpiredPurges(now: Date): Promise<number> {
    const r = await this.db.consentPurgeTask.deleteMany({
      where: { status: { in: ['DONE', 'DEAD'] }, retainUntil: { lte: now } },
    });
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
  constructor(private readonly db: SubjectKeyPrismaLike) {}

  async get(organizationId: string, lookupId: string): Promise<SubjectKeyState> {
    const r = await this.db.consentSubjectKey.findFirst({ where: { organizationId, lookupId } });
    if (!r) return { status: 'ABSENT' };
    return r.keyMaterial && !r.shreddedAt
      ? { status: 'ACTIVE', key: Buffer.from(r.keyMaterial) }
      : { status: 'SHREDDED' };
  }

  async getOrCreate(organizationId: string, lookupId: string, candidate: Buffer): Promise<Buffer> {
    const existing = await this.get(organizationId, lookupId);
    if (existing.status === 'SHREDDED')
      throw new SubjectShreddedError('Titular esquecido: chave destruída');
    if (existing.status === 'ACTIVE') return existing.key;
    try {
      await this.db.consentSubjectKey.create({
        data: { organizationId, lookupId, keyMaterial: candidate, shreddedAt: null },
      });
      return candidate;
    } catch (err) {
      const raced = await this.get(organizationId, lookupId);
      if (raced.status === 'ACTIVE') return raced.key;
      if (raced.status === 'SHREDDED')
        throw new SubjectShreddedError('Titular esquecido: chave destruída');
      throw err;
    }
  }

  async destroy(organizationId: string, lookupId: string): Promise<boolean> {
    const r = await this.db.consentSubjectKey.updateMany({
      where: { organizationId, lookupId, shreddedAt: null },
      data: { keyMaterial: null, shreddedAt: new Date() },
    });
    if (r.count > 0) return true;
    // Sem linha: grava tombstone mesmo assim (impede recriação futura).
    const state = await this.get(organizationId, lookupId);
    if (state.status === 'ABSENT') {
      await this.db.consentSubjectKey
        .create({ data: { organizationId, lookupId, keyMaterial: null, shreddedAt: new Date() } })
        .catch(() => undefined);
    }
    return false;
  }
}
