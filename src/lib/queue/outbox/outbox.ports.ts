/**
 * REMED-05 — Portas da outbox transacional e da idempotência durável.
 *
 * O Agente 16 programa contra estas interfaces. A implementação Prisma depende das tabelas
 * `DomainEventOutbox` e `DomainEventConsumption`, especificadas em
 * `.agents/handoffs/16-para-01-remed-05-outbox.md` (escopo do Agente 01).
 */
import type {
  DomainEventEnvelope,
  DomainEventType,
} from '../../../shared/contracts/domainEventMesh.contract.js';

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxRecord {
  id: string;
  eventId: string;
  eventType: DomainEventType;
  organizationId: string;
  /** Chave de idempotência do produtor (única por organização). */
  idempotencyKey?: string;
  envelope: DomainEventEnvelope;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lockedBy?: string;
  lockedUntil?: string;
  createdAt: string;
  dispatchedAt?: string;
  lastError?: string;
}

export type NewOutboxRecord = Omit<
  OutboxRecord,
  | 'status'
  | 'retryCount'
  | 'nextAttemptAt'
  | 'lockedBy'
  | 'lockedUntil'
  | 'dispatchedAt'
  | 'lastError'
>;

/** Repositório da outbox. `append` deve rodar no cliente transacional do caso de uso. */
export interface OutboxRef {
  id: string;
  organizationId: string;
}

export interface FailureUpdate {
  retryCount: number;
  /** Atraso até a próxima tentativa; a Prisma calcula `now() + delay` no SQL. */
  delayMs: number;
  /** Relógio de referência para a implementação em memória. */
  now: Date;
  lastError: string;
  deadLetter: boolean;
}

export interface AppendOptions {
  /**
   * Grava já reivindicado (status PROCESSING, lockedBy/lockedUntil) — usado pelo publish inline
   * para que um relay concorrente não entregue o mesmo registro durante a entrega inline.
   */
  claimFor?: { workerId: string; leaseMs: number };
}

export interface OutboxRepository {
  /** Insere; se já houver (organizationId, idempotencyKey), devolve o registro existente. */
  append(
    record: NewOutboxRecord,
    opts?: AppendOptions,
  ): Promise<{ record: OutboxRecord; created: boolean }>;
  /**
   * Reivindica até `limit` registros elegíveis (PENDING/FAILED vencidos ou lease expirado).
   * `now` só é usado pela implementação em memória; a Prisma usa now() do Postgres.
   * `organizationId` é obrigatório em adaptadores com RLS (o relay itera por tenant).
   */
  claimBatch(params: {
    workerId: string;
    limit: number;
    now: Date;
    leaseMs: number;
    organizationId?: string;
  }): Promise<OutboxRecord[]>;
  /** Tenants a varrer (adaptadores com RLS). Ausente = varredura única sem tenant. */
  listTenants?(): Promise<string[]>;
  markDispatched(ref: OutboxRef, workerId: string, at: Date): Promise<void>;
  markFailed(ref: OutboxRef, workerId: string, update: FailureUpdate): Promise<void>;
  findById(ref: OutboxRef): Promise<OutboxRecord | null>;
  /** Devolve registros DEAD_LETTER para PENDING (retryCount=0). Retorna quantos foram reenfileirados. */
  requeueDeadLetters(filter: {
    organizationId?: string;
    ids?: string[];
    now: Date;
  }): Promise<number>;
  /**
   * Retenção/LGPD: remove registros DISPATCHED/DEAD_LETTER anteriores a `olderThan`.
   * Retorna quantos foram removidos.
   */
  purge(params: {
    retentionMs: number;
    now: Date;
    statuses: Array<'DISPATCHED' | 'DEAD_LETTER'>;
  }): Promise<number>;
}

/**
 * Registro durável de consumo por (org, evento, consumidor), com reserva atômica.
 *
 * Semântica Prisma esperada:
 * - `reserve`: `INSERT ... ON CONFLICT (organizationId, eventId, consumer) DO UPDATE SET reservedBy=$owner,
 *   reservedUntil=$until WHERE completedAt IS NULL AND reservedUntil < now()` → true se inseriu/assumiu;
 *   false se já concluído ou reservado por outro dentro do lease (equivale a ON CONFLICT DO NOTHING).
 * - `complete`: `UPDATE SET completedAt=now() WHERE ... AND reservedBy=$owner`.
 * - `release`: `DELETE WHERE ... AND reservedBy=$owner AND completedAt IS NULL`.
 *
 * Garantia: no máximo um handler em execução por (org, evento, consumidor) a cada lease; após
 * `complete`, nunca reexecuta. Se o processo morrer entre o efeito do handler e `complete`, o lease
 * expira e o handler roda de novo → para esse caso extremo a entrega é at-least-once, e handlers com
 * efeito externo devem ser idempotentes (ou gravar o efeito e o `complete` na mesma transação).
 */
export interface ConsumptionStore {
  reserve(p: {
    organizationId: string;
    eventId: string;
    consumer: string;
    owner: string;
    now: Date;
    leaseMs: number;
  }): Promise<boolean>;
  complete(p: {
    organizationId: string;
    eventId: string;
    consumer: string;
    owner: string;
    now: Date;
  }): Promise<void>;
  release(p: {
    organizationId: string;
    eventId: string;
    consumer: string;
    owner: string;
  }): Promise<void>;
  isCompleted(organizationId: string, eventId: string, consumer: string): Promise<boolean>;
}

/** Abstração de transação: o caso de uso escreve seus dados e a outbox no mesmo `tx`. */
export interface OutboxUnitOfWork<TTx = unknown> {
  run<R>(fn: (ctx: { tx: TTx; outbox: OutboxRepository }) => Promise<R>): Promise<R>;
}
