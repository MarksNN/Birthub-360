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
export interface OutboxRepository {
  /** Insere; se já houver (organizationId, idempotencyKey), devolve o registro existente. */
  append(record: NewOutboxRecord): Promise<{ record: OutboxRecord; created: boolean }>;
  /** Reivindica até `limit` registros elegíveis (PENDING/FAILED com nextAttemptAt <= now ou lock expirado). */
  claimBatch(params: {
    workerId: string;
    limit: number;
    now: Date;
    leaseMs: number;
  }): Promise<OutboxRecord[]>;
  markDispatched(id: string, workerId: string, at: Date): Promise<void>;
  markFailed(
    id: string,
    workerId: string,
    update: { retryCount: number; nextAttemptAt: Date; lastError: string; deadLetter: boolean },
  ): Promise<void>;
  findById(id: string): Promise<OutboxRecord | null>;
}

/** Registro durável de consumo: garante exactly-once efetivo por (org, evento, consumidor). */
export interface ConsumptionStore {
  /** Retorna true se já consumido com sucesso. */
  has(organizationId: string, eventId: string, consumer: string): Promise<boolean>;
  /** Registra consumo; deve ser idempotente (unique). */
  record(organizationId: string, eventId: string, consumer: string, at: Date): Promise<void>;
}

/** Abstração de transação: o caso de uso escreve seus dados e a outbox no mesmo `tx`. */
export interface OutboxUnitOfWork<TTx = unknown> {
  run<R>(fn: (ctx: { tx: TTx; outbox: OutboxRepository }) => Promise<R>): Promise<R>;
}
