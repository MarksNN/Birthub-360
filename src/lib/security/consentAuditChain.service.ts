import { createHash, randomUUID } from 'node:crypto';
import type {
  ConsentAuditEvent,
  IConsentAuditChainPort,
} from '../../shared/contracts/consentAudit.contract.js';
import { logger } from '../logger.js';

export const GENESIS_HASH = '0'.repeat(64);

/** Evento persistido: inclui a posição na cadeia do tenant (sequence 1..n). */
export interface StoredConsentAuditEvent extends ConsentAuditEvent {
  sequence: number;
}

export interface ChainLockContext {
  last: StoredConsentAuditEvent | null;
  append: (event: StoredConsentAuditEvent) => Promise<void>;
}

/**
 * REMED-06 — Porta de persistência da cadeia. A implementação durável é
 * `PrismaConsentAuditChainRepository` (PostgreSQL). A implementação em memória
 * existe apenas para testes/ambientes sem banco.
 */
export interface ConsentAuditChainRepository {
  /**
   * Executa `fn` com exclusão mútua por tenant (no Postgres: transação + advisory lock),
   * entregando o último elo atual da cadeia e um `append` dentro da mesma transação.
   */
  withTenantLock<T>(organizationId: string, fn: (ctx: ChainLockContext) => Promise<T>): Promise<T>;
  /** Cadeia completa do tenant ordenada por `sequence` ascendente. */
  listChain(organizationId: string): Promise<StoredConsentAuditEvent[]>;
}

export class InMemoryConsentAuditChainRepository implements ConsentAuditChainRepository {
  private chains = new Map<string, StoredConsentAuditEvent[]>();
  private locks = new Map<string, Promise<unknown>>();

  async withTenantLock<T>(
    organizationId: string,
    fn: (ctx: ChainLockContext) => Promise<T>,
  ): Promise<T> {
    const prev = this.locks.get(organizationId) ?? Promise.resolve();
    const run = prev.then(async () => {
      const chain = this.chains.get(organizationId) ?? [];
      return fn({
        last: chain.at(-1) ?? null,
        append: async (event) => {
          chain.push({ ...event });
          this.chains.set(organizationId, chain);
        },
      });
    });
    this.locks.set(
      organizationId,
      run.catch(() => undefined),
    );
    return run;
  }

  async listChain(organizationId: string): Promise<StoredConsentAuditEvent[]> {
    return (this.chains.get(organizationId) ?? []).map((e) => ({ ...e }));
  }

  /** Somente testes: acesso direto ao armazenamento para simular adulteração. */
  rawChain(organizationId: string): StoredConsentAuditEvent[] {
    return this.chains.get(organizationId) ?? [];
  }

  clear(): void {
    this.chains.clear();
    this.locks.clear();
  }
}

/** Formato canônico do conteúdo hasheado. Alterar exige versionamento da cadeia (handoff 15). */
export function computeConsentEventHash(
  event: Omit<StoredConsentAuditEvent, 'currentHash'> | Omit<ConsentAuditEvent, 'currentHash'>,
): string {
  const sequence = 'sequence' in event ? event.sequence : '';
  const raw = JSON.stringify([
    'consent-chain/v2',
    sequence,
    event.previousHash,
    event.id,
    event.organizationId,
    event.subjectRef,
    event.purpose,
    event.termsVersion,
    event.status,
    event.occurredAt,
    event.operatorUserId ?? '',
    event.retentionUntil ?? '',
  ]);
  return createHash('sha256').update(raw).digest('hex');
}

export interface ChainVerificationResult {
  valid: boolean;
  totalRecords: number;
  brokenAtId?: string;
  reason?: 'SEQUENCE_GAP' | 'PREVIOUS_HASH_MISMATCH' | 'HASH_MISMATCH' | 'TENANT_MISMATCH';
}

/** Função pura de verificação da cadeia (reutilizável por job/endpoint de auditoria). */
export function verifyConsentChain(
  organizationId: string,
  chain: StoredConsentAuditEvent[],
): ChainVerificationResult {
  let expectedPrev = GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const r = chain[i];
    const fail = (reason: ChainVerificationResult['reason']): ChainVerificationResult => {
      logger.error(
        { organizationId, recordId: r.id, index: i, reason },
        'ConsentAuditChain: violação de integridade detectada',
      );
      return { valid: false, totalRecords: chain.length, brokenAtId: r.id, reason };
    };
    if (r.organizationId !== organizationId) return fail('TENANT_MISMATCH');
    if (r.sequence !== i + 1) return fail('SEQUENCE_GAP');
    if (r.previousHash !== expectedPrev) return fail('PREVIOUS_HASH_MISMATCH');
    const { currentHash, ...content } = r;
    if (computeConsentEventHash(content) !== currentHash) return fail('HASH_MISMATCH');
    expectedPrev = currentHash;
  }
  return { valid: true, totalRecords: chain.length };
}

export class ConsentAuditChainService implements IConsentAuditChainPort {
  constructor(
    private readonly repo: ConsentAuditChainRepository = new InMemoryConsentAuditChainRepository(),
  ) {}

  private assertTenant(organizationId: string): void {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: ConsentAuditChain exige organizationId');
    }
  }

  private async append(
    organizationId: string,
    build: (seq: number, previousHash: string) => Omit<StoredConsentAuditEvent, 'currentHash'>,
  ): Promise<StoredConsentAuditEvent> {
    return this.repo.withTenantLock(organizationId, async ({ last, append }) => {
      const partial = build((last?.sequence ?? 0) + 1, last?.currentHash ?? GENESIS_HASH);
      const event: StoredConsentAuditEvent = {
        ...partial,
        currentHash: computeConsentEventHash(partial),
      };
      await append(event);
      return event;
    });
  }

  /** Registra consentimento na trilha encadeada (append-only, durável via repositório). */
  async recordConsent(input: {
    organizationId: string;
    subjectRef: string;
    purpose: string;
    termsVersion: string;
    operatorUserId?: string;
    retentionDays?: number;
  }): Promise<ConsentAuditEvent> {
    this.assertTenant(input.organizationId);
    const event = await this.append(input.organizationId, (sequence, previousHash) => ({
      id: `cst-${randomUUID()}`,
      sequence,
      organizationId: input.organizationId,
      subjectRef: input.subjectRef,
      purpose: input.purpose,
      termsVersion: input.termsVersion,
      previousHash,
      occurredAt: new Date().toISOString(),
      operatorUserId: input.operatorUserId,
      status: 'GRANTED',
      retentionUntil: input.retentionDays
        ? new Date(Date.now() + input.retentionDays * 86_400_000).toISOString()
        : undefined,
    }));
    logger.info(
      { id: event.id, organizationId: event.organizationId, sequence: event.sequence },
      'ConsentAuditChain: consentimento registrado e selado na cadeia',
    );
    return event;
  }

  /** Revogação formal (direito do titular). Dispara retração nos consumidores registrados. */
  async revokeConsent(
    organizationId: string,
    subjectRef: string,
    reason: string,
    operatorUserId?: string,
  ): Promise<ConsentAuditEvent> {
    this.assertTenant(organizationId);
    const event = await this.append(organizationId, (sequence, previousHash) => ({
      id: `rev-${randomUUID()}`,
      sequence,
      organizationId,
      subjectRef,
      purpose: `REVOCATION: ${reason}`,
      termsVersion: 'REVOKED',
      previousHash,
      occurredAt: new Date().toISOString(),
      operatorUserId,
      status: 'REVOKED',
    }));
    logger.warn(
      { id: event.id, organizationId, sequence: event.sequence },
      'ConsentAuditChain: consentimento REVOGADO registrado na cadeia',
    );
    for (const listener of this.revocationListeners) {
      await listener(organizationId, subjectRef);
    }
    return event;
  }

  private revocationListeners: Array<
    (organizationId: string, subjectRef: string) => Promise<unknown>
  > = [];

  /** Consumidores (ex.: Flywheel) que precisam expurgar dados ao revogar consentimento. */
  onRevocation(listener: (organizationId: string, subjectRef: string) => Promise<unknown>): void {
    this.revocationListeners.push(listener);
  }

  async verifyChainIntegrity(organizationId: string): Promise<ChainVerificationResult> {
    this.assertTenant(organizationId);
    return verifyConsentChain(organizationId, await this.repo.listChain(organizationId));
  }

  async getChain(organizationId: string): Promise<StoredConsentAuditEvent[]> {
    this.assertTenant(organizationId);
    return this.repo.listChain(organizationId);
  }
}

export const consentAuditChain = new ConsentAuditChainService();
