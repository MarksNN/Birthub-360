/**
 * REMED-06 — Repositório durável (PostgreSQL) da cadeia de consentimento.
 *
 * DEPENDE DE HANDOFF AO AGENTE 01: o model `ConsentAuditRecord` ainda NÃO existe em
 * `prisma/schema.prisma`. Este arquivo é tipado contra um delegate estrutural mínimo
 * (`ConsentAuditPrismaLike`) para compilar antes da migração; após a migração do 01,
 * basta instanciar com o `prisma` real. Especificação exata: PR do agente 21 / handoff.
 */
import type {
  ChainLockContext,
  ConsentAuditChainRepository,
  StoredConsentAuditEvent,
} from './consentAuditChain.service.js';

export interface ConsentAuditRow {
  id: string;
  organizationId: string;
  sequence: number;
  kind: 'GENESIS' | 'CONSENT' | 'REVOCATION' | 'RETRACTION';
  subjectRef: string;
  purpose: string;
  termsVersion: string;
  status: 'GRANTED' | 'REVOKED' | 'EXPIRED';
  previousHash: string;
  currentHash: string;
  occurredAt: Date;
  operatorUserId: string | null;
  retentionUntil: Date | null;
}

interface ConsentAuditDelegate {
  findFirst(args: {
    where: { organizationId: string };
    orderBy: { sequence: 'desc' };
  }): Promise<ConsentAuditRow | null>;
  findMany(args: {
    where: { organizationId: string };
    orderBy: { sequence: 'asc' };
  }): Promise<ConsentAuditRow[]>;
  create(args: { data: ConsentAuditRow }): Promise<unknown>;
}

export interface ConsentAuditTx {
  consentAuditRecord: ConsentAuditDelegate;
  $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
}

export interface ConsentAuditPrismaLike extends ConsentAuditTx {
  $transaction<T>(fn: (tx: ConsentAuditTx) => Promise<T>): Promise<T>;
}

const toEvent = (r: ConsentAuditRow): StoredConsentAuditEvent => ({
  id: r.id,
  organizationId: r.organizationId,
  sequence: r.sequence,
  kind: r.kind,
  subjectRef: r.subjectRef,
  purpose: r.purpose,
  termsVersion: r.termsVersion,
  status: r.status,
  previousHash: r.previousHash,
  currentHash: r.currentHash,
  occurredAt: r.occurredAt.toISOString(),
  operatorUserId: r.operatorUserId ?? undefined,
  retentionUntil: r.retentionUntil?.toISOString(),
});

export class PrismaConsentAuditChainRepository implements ConsentAuditChainRepository {
  constructor(private readonly db: ConsentAuditPrismaLike) {}

  async withTenantLock<T>(
    organizationId: string,
    fn: (ctx: ChainLockContext) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      // Serializa appends por tenant; liberado no fim da transação.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('consent-chain:' || ${organizationId}))`;
      const lastRow = await tx.consentAuditRecord.findFirst({
        where: { organizationId },
        orderBy: { sequence: 'desc' },
      });
      return fn({
        last: lastRow ? toEvent(lastRow) : null,
        append: async (e) => {
          await tx.consentAuditRecord.create({
            data: {
              id: e.id,
              organizationId: e.organizationId,
              sequence: e.sequence,
              kind: e.kind,
              subjectRef: e.subjectRef,
              purpose: e.purpose,
              termsVersion: e.termsVersion,
              status: e.status,
              previousHash: e.previousHash,
              currentHash: e.currentHash,
              occurredAt: new Date(e.occurredAt),
              operatorUserId: e.operatorUserId ?? null,
              retentionUntil: e.retentionUntil ? new Date(e.retentionUntil) : null,
            },
          });
        },
      });
    });
  }

  async listChain(organizationId: string): Promise<StoredConsentAuditEvent[]> {
    const rows = await this.db.consentAuditRecord.findMany({
      where: { organizationId },
      orderBy: { sequence: 'asc' },
    });
    return rows.map(toEvent);
  }
}
