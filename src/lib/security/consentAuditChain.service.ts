import { createHash, randomUUID } from 'node:crypto';
import type {
  ConsentAuditEvent,
  IConsentAuditChainPort,
} from '../../shared/contracts/consentAudit.contract.js';
import { logger } from '../logger.js';
import { canonicalJson } from './canonicalJson.js';
import { SUBJECT_TOKEN_PATTERN, type SubjectTokenizer } from './subjectTokenizer.js';

export { canonicalJson } from './canonicalJson.js';

export const GENESIS_HASH = '0'.repeat(64);
/** Versão do formato canônico/hash (F6). Mudanças exigem nova versão, nunca reescrita. */
export const CONSENT_CHAIN_FORMAT_VERSION = 3;

export type ConsentChainEventKind = 'GENESIS' | 'CONSENT' | 'REVOCATION' | 'RETRACTION';

/** Motivo de revogação — enum fechado; texto livre nunca entra na cadeia (F3 / P3-1). */
export const REVOCATION_REASON_CODES = [
  'TITULAR_REQUEST',
  'ERASURE_REQUEST',
  'PURPOSE_FULFILLED',
  'LEGAL_OBLIGATION',
  'OPERATOR_CORRECTION',
] as const;
export type RevocationReasonCode = (typeof REVOCATION_REASON_CODES)[number];
export function isRevocationReasonCode(v: unknown): v is RevocationReasonCode {
  return typeof v === 'string' && (REVOCATION_REASON_CODES as readonly string[]).includes(v);
}

export interface StoredConsentAuditEvent extends ConsentAuditEvent {
  formatVersion: number;
  /** 0 = gênese do tenant. */
  sequence: number;
  kind: ConsentChainEventKind;
  reasonCode?: RevocationReasonCode;
}

/** Ponteiro de cabeça da cadeia (F5 / P2-2): detecta truncamento de cauda e recriação. */
export interface ConsentChainHead {
  organizationId: string;
  genesisId: string;
  genesisHash: string;
  lastSequence: number;
  lastHash: string;
}

/** Tarefa de expurgo (outbox) gravada na MESMA transação da revogação (F4 / P2-3). */
export interface ConsentPurgeTask {
  id: string;
  organizationId: string;
  revocationEventId: string;
  /** Referência operacional do titular; anulada ao concluir (minimização). */
  subjectRef: string | null;
  shredSubjectKey: boolean;
  status: 'PENDING' | 'DONE' | 'DEAD';
  attempts: number;
  nextAttemptAt: string;
  lastError?: string;
  completedAt?: string;
  /** Retenção do registro da tarefa (prova do atendimento), após a qual é excluído. */
  retainUntil?: string;
}

/** Detalhe livre opcional de um evento — FORA da cadeia, expurgável (F3). */
export interface ConsentEventDetail {
  eventId: string;
  organizationId: string;
  subjectLookupId: string;
  detail: string;
}

export interface ChainLockContext {
  head: ConsentChainHead | null;
  last: StoredConsentAuditEvent | null;
  append: (event: StoredConsentAuditEvent) => Promise<void>;
  setHead: (head: ConsentChainHead) => Promise<void>;
  enqueuePurge: (task: ConsentPurgeTask) => Promise<void>;
  saveDetail: (detail: ConsentEventDetail) => Promise<void>;
}

export interface ConsentAuditChainRepository {
  /** Exclusão mútua por tenant (Postgres: transação + advisory lock); tudo no ctx é atômico. */
  withTenantLock<T>(organizationId: string, fn: (ctx: ChainLockContext) => Promise<T>): Promise<T>;
  listChain(organizationId: string): Promise<StoredConsentAuditEvent[]>;
  getHead(organizationId: string): Promise<ConsentChainHead | null>;
  claimDuePurges(now: Date, limit: number): Promise<ConsentPurgeTask[]>;
  updatePurge(task: ConsentPurgeTask): Promise<void>;
  deleteExpiredPurges(now: Date): Promise<number>;
  deleteDetailsForSubject(organizationId: string, subjectLookupId: string): Promise<number>;
}

export class InMemoryConsentAuditChainRepository implements ConsentAuditChainRepository {
  private chains = new Map<string, StoredConsentAuditEvent[]>();
  private heads = new Map<string, ConsentChainHead>();
  readonly purges = new Map<string, ConsentPurgeTask>();
  readonly details = new Map<string, ConsentEventDetail>();
  private locks = new Map<string, Promise<unknown>>();

  async withTenantLock<T>(
    organizationId: string,
    fn: (ctx: ChainLockContext) => Promise<T>,
  ): Promise<T> {
    const prev = this.locks.get(organizationId) ?? Promise.resolve();
    const run = prev.then(async () => {
      // Transação simulada: acumula e só aplica se `fn` concluir.
      const chain = this.chains.get(organizationId) ?? [];
      const staged: StoredConsentAuditEvent[] = [];
      const stagedPurges: ConsentPurgeTask[] = [];
      const stagedDetails: ConsentEventDetail[] = [];
      let stagedHead: ConsentChainHead | undefined;
      const result = await fn({
        head: this.heads.get(organizationId)
          ? { ...(this.heads.get(organizationId) as ConsentChainHead) }
          : null,
        last: chain.at(-1) ? { ...(chain.at(-1) as StoredConsentAuditEvent) } : null,
        append: async (e) => {
          staged.push({ ...e });
        },
        setHead: async (h) => {
          stagedHead = { ...h };
        },
        enqueuePurge: async (t) => {
          stagedPurges.push({ ...t });
        },
        saveDetail: async (d) => {
          stagedDetails.push({ ...d });
        },
      });
      chain.push(...staged);
      this.chains.set(organizationId, chain);
      if (stagedHead) this.heads.set(organizationId, stagedHead);
      for (const t of stagedPurges) this.purges.set(t.id, t);
      for (const d of stagedDetails) this.details.set(d.eventId, d);
      return result;
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

  async getHead(organizationId: string): Promise<ConsentChainHead | null> {
    const h = this.heads.get(organizationId);
    return h ? { ...h } : null;
  }

  async claimDuePurges(now: Date, limit: number): Promise<ConsentPurgeTask[]> {
    return [...this.purges.values()]
      .filter((t) => t.status === 'PENDING' && new Date(t.nextAttemptAt) <= now)
      .slice(0, limit)
      .map((t) => ({ ...t }));
  }

  async updatePurge(task: ConsentPurgeTask): Promise<void> {
    this.purges.set(task.id, { ...task });
  }

  async deleteExpiredPurges(now: Date): Promise<number> {
    let n = 0;
    for (const [id, t] of this.purges) {
      if (t.status !== 'PENDING' && t.retainUntil && new Date(t.retainUntil) <= now) {
        this.purges.delete(id);
        n++;
      }
    }
    return n;
  }

  async deleteDetailsForSubject(organizationId: string, subjectLookupId: string): Promise<number> {
    let n = 0;
    for (const [id, d] of this.details) {
      if (d.organizationId === organizationId && d.subjectLookupId === subjectLookupId) {
        this.details.delete(id);
        n++;
      }
    }
    return n;
  }

  /** Somente testes: acesso direto para simular adulteração. */
  rawChain(organizationId: string): StoredConsentAuditEvent[] {
    return this.chains.get(organizationId) ?? [];
  }

  rawHeads(): Map<string, ConsentChainHead> {
    return this.heads;
  }

  clear(): void {
    this.chains.clear();
    this.heads.clear();
    this.purges.clear();
    this.details.clear();
    this.locks.clear();
  }
}

/** hash = sha256(previousHash + JSON canônico de todos os demais campos, exceto currentHash). */
export function computeConsentEventHash(
  event: Omit<StoredConsentAuditEvent, 'currentHash'>,
): string {
  const { previousHash, ...payload } = event;
  return createHash('sha256')
    .update(previousHash + canonicalJson(payload))
    .digest('hex');
}

export type ChainViolation =
  | 'HEAD_MISSING'
  | 'TRUNCATED'
  | 'GENESIS_REPLACED'
  | 'SEQUENCE_GAP'
  | 'REORDERED'
  | 'GENESIS_INVALID'
  | 'PREVIOUS_HASH_MISMATCH'
  | 'HASH_MISMATCH'
  | 'TENANT_MISMATCH'
  | 'PII_IN_CHAIN';

export interface ChainVerificationResult {
  valid: boolean;
  totalRecords: number;
  brokenAtId?: string;
  reason?: ChainViolation;
}

/**
 * Verificação pura da cadeia. Com `head` (ou checkpoint externo) detecta também truncamento de
 * cauda e recriação da cadeia a partir de um novo gênese.
 */
export function verifyConsentChain(
  organizationId: string,
  chain: StoredConsentAuditEvent[],
  head?: ConsentChainHead | null,
): ChainVerificationResult {
  const fail = (reason: ChainViolation, id?: string): ChainVerificationResult => {
    logger.error(
      { organizationId, recordId: id, reason },
      'ConsentAuditChain: violação de integridade',
    );
    return { valid: false, totalRecords: chain.length, brokenAtId: id, reason };
  };
  let expectedPrev = GENESIS_HASH;
  for (let i = 0; i < chain.length; i++) {
    const r = chain[i];
    if (r.organizationId !== organizationId) return fail('TENANT_MISMATCH', r.id);
    if (r.sequence !== i) return fail(r.sequence < i ? 'REORDERED' : 'SEQUENCE_GAP', r.id);
    if ((i === 0) !== (r.kind === 'GENESIS')) return fail('GENESIS_INVALID', r.id);
    if (r.previousHash !== expectedPrev) return fail('PREVIOUS_HASH_MISMATCH', r.id);
    const { currentHash, ...content } = r;
    if (computeConsentEventHash(content) !== currentHash) return fail('HASH_MISMATCH', r.id);
    if (r.kind !== 'GENESIS' && !SUBJECT_TOKEN_PATTERN.test(r.subjectRef))
      return fail('PII_IN_CHAIN', r.id);
    expectedPrev = currentHash;
  }
  if (head === undefined) return { valid: true, totalRecords: chain.length };
  if (!head) return chain.length === 0 ? { valid: true, totalRecords: 0 } : fail('HEAD_MISSING');
  if (chain.length === 0) return fail('TRUNCATED');
  if (chain[0].id !== head.genesisId || chain[0].currentHash !== head.genesisHash) {
    return fail('GENESIS_REPLACED', chain[0].id);
  }
  const last = chain[chain.length - 1];
  if (last.sequence !== head.lastSequence || last.currentHash !== head.lastHash) {
    return fail('TRUNCATED', last.id);
  }
  return { valid: true, totalRecords: chain.length };
}

export type SubjectPurger = (
  organizationId: string,
  subjectRef: string,
) => Promise<Record<string, number>>;

export class ConsentChainUnavailableError extends Error {}

export interface ConsentAuditChainOptions {
  repo: ConsentAuditChainRepository;
  tokenizer: SubjectTokenizer;
  /** Retenção do registro da tarefa de expurgo após conclusão (dias). */
  purgeTaskRetentionDays?: number;
  maxPurgeAttempts?: number;
  /** Notifica outras instâncias para invalidar caches em memória (pub/sub). */
  broadcastPurge?: (organizationId: string, subjectRef: string) => Promise<void>;
}

export class ConsentAuditChainService implements IConsentAuditChainPort {
  private readonly purgers = new Map<string, SubjectPurger>();

  constructor(private readonly opts: ConsentAuditChainOptions) {}

  private assertTenant(organizationId: string): void {
    if (!organizationId || organizationId.trim() === '') {
      throw new Error('Tenancy violation: ConsentAuditChain exige organizationId');
    }
  }

  private async append(
    organizationId: string,
    build: (seq: number, previousHash: string) => Omit<StoredConsentAuditEvent, 'currentHash'>,
    after?: (event: StoredConsentAuditEvent, ctx: ChainLockContext) => Promise<void>,
  ): Promise<StoredConsentAuditEvent> {
    return this.opts.repo.withTenantLock(organizationId, async (ctx) => {
      let tip = ctx.last;
      let head = ctx.head;
      if (!tip && head) {
        // Head existe mas a cadeia sumiu: recusa recriar (F5).
        throw new ConsentChainUnavailableError(
          'Cadeia truncada/recriada: head existe sem registros',
        );
      }
      if (!tip) {
        const g: Omit<StoredConsentAuditEvent, 'currentHash'> = {
          formatVersion: CONSENT_CHAIN_FORMAT_VERSION,
          id: `gen-${randomUUID()}`,
          kind: 'GENESIS',
          sequence: 0,
          organizationId,
          subjectRef: '',
          purpose: 'GENESIS',
          termsVersion: `consent-chain/v${CONSENT_CHAIN_FORMAT_VERSION}`,
          status: 'GRANTED',
          previousHash: GENESIS_HASH,
          occurredAt: new Date().toISOString(),
        };
        tip = { ...g, currentHash: computeConsentEventHash(g) };
        await ctx.append(tip);
        head = {
          organizationId,
          genesisId: tip.id,
          genesisHash: tip.currentHash,
          lastSequence: 0,
          lastHash: tip.currentHash,
        };
      }
      if (head && (head.lastSequence !== tip.sequence || head.lastHash !== tip.currentHash)) {
        throw new ConsentChainUnavailableError('Head divergente do último elo — append recusado');
      }
      const partial = build(tip.sequence + 1, tip.currentHash);
      const event: StoredConsentAuditEvent = {
        ...partial,
        currentHash: computeConsentEventHash(partial),
      };
      await ctx.append(event);
      await ctx.setHead({
        organizationId,
        genesisId: head?.genesisId ?? tip.id,
        genesisHash: head?.genesisHash ?? tip.currentHash,
        lastSequence: event.sequence,
        lastHash: event.currentHash,
      });
      if (after) await after(event, ctx);
      return event;
    });
  }

  private base(kind: ConsentChainEventKind, organizationId: string, subjectToken: string) {
    return {
      formatVersion: CONSENT_CHAIN_FORMAT_VERSION,
      kind,
      organizationId,
      subjectRef: subjectToken,
      occurredAt: new Date().toISOString(),
    };
  }

  async recordConsent(input: {
    organizationId: string;
    subjectRef: string;
    purpose: string;
    termsVersion: string;
    operatorUserId?: string;
    retentionDays?: number;
  }): Promise<ConsentAuditEvent> {
    this.assertTenant(input.organizationId);
    const token = await this.opts.tokenizer.tokenFor(input.organizationId, input.subjectRef);
    const event = await this.append(input.organizationId, (sequence, previousHash) => ({
      ...this.base('CONSENT', input.organizationId, token),
      id: `cst-${randomUUID()}`,
      sequence,
      previousHash,
      purpose: input.purpose,
      termsVersion: input.termsVersion,
      operatorUserId: input.operatorUserId,
      status: 'GRANTED',
      retentionUntil: input.retentionDays
        ? new Date(Date.now() + input.retentionDays * 86_400_000).toISOString()
        : undefined,
    }));
    logger.info(
      { id: event.id, organizationId: event.organizationId, sequence: event.sequence },
      'ConsentAuditChain: consentimento registrado',
    );
    return event;
  }

  /**
   * Revogação (art. 8º §5º / art. 18, IX). `reason` DEVE ser um `RevocationReasonCode`.
   * Na MESMA transação: evento REVOCATION + tarefa de expurgo (outbox) + detalhe livre opcional
   * fora da cadeia. `ERASURE_REQUEST` também agenda crypto-shredding da chave do titular.
   */
  async revokeConsent(
    organizationId: string,
    subjectRef: string,
    reason: string,
    operatorUserId?: string,
    options: { detail?: string; processNow?: boolean } = {},
  ): Promise<ConsentAuditEvent> {
    this.assertTenant(organizationId);
    if (!isRevocationReasonCode(reason)) {
      throw new Error(`reason inválido: use um de ${REVOCATION_REASON_CODES.join(', ')}`);
    }
    const token = await this.opts.tokenizer.tokenFor(organizationId, subjectRef);
    const lookupId = await this.opts.tokenizer.lookupId(organizationId, subjectRef);
    const event = await this.append(
      organizationId,
      (sequence, previousHash) => ({
        ...this.base('REVOCATION', organizationId, token),
        id: `rev-${randomUUID()}`,
        sequence,
        previousHash,
        purpose: 'REVOCATION',
        termsVersion: 'REVOKED',
        reasonCode: reason,
        operatorUserId,
        status: 'REVOKED',
      }),
      async (ev, ctx) => {
        await ctx.enqueuePurge({
          id: `prg-${randomUUID()}`,
          organizationId,
          revocationEventId: ev.id,
          subjectRef,
          shredSubjectKey: reason === 'ERASURE_REQUEST',
          status: 'PENDING',
          attempts: 0,
          nextAttemptAt: new Date().toISOString(),
        });
        if (options.detail) {
          await ctx.saveDetail({
            eventId: ev.id,
            organizationId,
            subjectLookupId: lookupId,
            detail: options.detail,
          });
        }
      },
    );
    logger.warn(
      { id: event.id, organizationId, reason },
      'ConsentAuditChain: consentimento REVOGADO',
    );
    if (options.processNow !== false) {
      // Melhor esforço imediato; falhas ficam na outbox para o worker de reconciliação.
      await this.processPendingPurges().catch((err) =>
        logger.error(
          { err, organizationId },
          'ConsentAuditChain: expurgo imediato falhou; ficará pendente',
        ),
      );
    }
    return event;
  }

  /** Define o publicador de invalidação entre instâncias (wiring do bootstrap). */
  setPurgeBroadcaster(fn: ConsentAuditChainOptions['broadcastPurge']): void {
    this.opts.broadcastPurge = fn;
  }

  /** Registra um consumidor de expurgo (wiring explícito no bootstrap; deve ser idempotente). */
  registerPurger(name: string, purger: SubjectPurger): void {
    this.purgers.set(name, purger);
  }

  /**
   * Processa a outbox de expurgo: idempotente e reprocessável (retry com backoff exponencial).
   * Ao concluir: grava RETRACTION (token + contagens, sem PII), aplica crypto-shredding se
   * pedido, anula `subjectRef` da tarefa e define a retenção do registro.
   */
  async processPendingPurges(
    limit = 50,
    now = new Date(),
  ): Promise<{ done: number; failed: number }> {
    const tasks = await this.opts.repo.claimDuePurges(now, limit);
    let done = 0;
    let failed = 0;
    for (const task of tasks) {
      try {
        if (!task.subjectRef) throw new Error('Tarefa sem subjectRef');
        const subjectRef = task.subjectRef;
        const counts: Record<string, number> = {};
        for (const [name, purger] of this.purgers) {
          const res = await purger(task.organizationId, subjectRef);
          for (const [k, v] of Object.entries(res)) counts[`${name}.${k}`] = v;
        }
        await this.opts.broadcastPurge?.(task.organizationId, subjectRef);
        const token = await this.opts.tokenizer.tokenFor(task.organizationId, subjectRef);
        await this.append(task.organizationId, (sequence, previousHash) => ({
          ...this.base('RETRACTION', task.organizationId, token),
          id: `ret-${randomUUID()}`,
          sequence,
          previousHash,
          purpose: `RETRACTION:${canonicalJson({ revocationEventId: task.revocationEventId, counts })}`,
          termsVersion: 'RETRACTED',
          status: 'REVOKED',
        }));
        if (task.shredSubjectKey) {
          const { lookupId } = await this.opts.tokenizer.shred(task.organizationId, subjectRef);
          await this.opts.repo.deleteDetailsForSubject(task.organizationId, lookupId);
        }
        const retentionDays = this.opts.purgeTaskRetentionDays ?? 1825;
        await this.opts.repo.updatePurge({
          ...task,
          subjectRef: null,
          status: 'DONE',
          attempts: task.attempts + 1,
          completedAt: now.toISOString(),
          retainUntil: new Date(now.getTime() + retentionDays * 86_400_000).toISOString(),
          lastError: undefined,
        });
        done++;
      } catch (err) {
        failed++;
        const attempts = task.attempts + 1;
        const dead = attempts >= (this.opts.maxPurgeAttempts ?? 10);
        await this.opts.repo.updatePurge({
          ...task,
          attempts,
          status: dead ? 'DEAD' : 'PENDING',
          nextAttemptAt: new Date(
            now.getTime() + Math.min(2 ** attempts, 3600) * 1000,
          ).toISOString(),
          lastError: err instanceof Error ? err.message.slice(0, 200) : 'erro',
        });
        logger.error({ taskId: task.id, attempts, dead }, 'ConsentAuditChain: expurgo falhou');
      }
    }
    await this.opts.repo.deleteExpiredPurges(now);
    return { done, failed };
  }

  async verifyChainIntegrity(organizationId: string): Promise<ChainVerificationResult> {
    this.assertTenant(organizationId);
    const [chain, head] = await Promise.all([
      this.opts.repo.listChain(organizationId),
      this.opts.repo.getHead(organizationId),
    ]);
    return verifyConsentChain(organizationId, chain, head);
  }

  async getChain(organizationId: string): Promise<StoredConsentAuditEvent[]> {
    this.assertTenant(organizationId);
    return this.opts.repo.listChain(organizationId);
  }

  /** Somente testes: limpa repositório em memória. */
  clear(): void {
    if (this.opts.repo instanceof InMemoryConsentAuditChainRepository) this.opts.repo.clear();
  }
}
