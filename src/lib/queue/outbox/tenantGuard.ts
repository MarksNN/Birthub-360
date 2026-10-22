/**
 * REMED-05 — guarda de contexto da UoW da outbox (decisão do Marks, 2026-10-21):
 * - fail-closed sem tenant: nunca grava com `app.current_tenant_id` vazio;
 * - nunca herda `bypassRls` do contexto ambiente;
 * - exceção: job de sistema EXPLÍCITO, por opt-in nomeado em `OUTBOX_SYSTEM_JOBS` (lista congelada,
 *   só alterável por código revisado pelo 24). Mesmo assim o job roda com tenant explícito e
 *   `bypassRls=false` (ver `outboxUnitOfWorkContext`).
 */
export class OutboxTenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboxTenantContextError';
  }
}

/**
 * Allowlist de jobs de sistema que podem abrir a UoW a partir de um contexto com bypass.
 * CONGELADA (parecer 15, G4): `Object.freeze` — nenhuma mutação em runtime. Para incluir um job,
 * edite esta lista (nome + motivo) com revisão do 24.
 */
export const OUTBOX_SYSTEM_JOBS: readonly string[] = Object.freeze([] as string[]);

export interface OutboxContextStore {
  tenantId?: string;
  bypassRls?: boolean;
  outboxSystemJob?: string;
  [key: string]: unknown;
}

export function requireOutboxTenantContext(
  store: OutboxContextStore | undefined,
  allowedSystemJobs: readonly string[] = OUTBOX_SYSTEM_JOBS,
): string {
  const tenantId = store?.tenantId?.trim();
  if (store?.bypassRls) {
    const job = store.outboxSystemJob;
    if (!job || !allowedSystemJobs.includes(job)) {
      throw new OutboxTenantContextError(
        'DomainEventOutbox UoW: contexto com bypassRls não é permitido (a transação herdaria app.bypass_rls=on). ' +
          'Jobs de sistema precisam de opt-in nomeado em OUTBOX_SYSTEM_JOBS.',
      );
    }
  }
  if (!tenantId) {
    throw new OutboxTenantContextError(
      'DomainEventOutbox UoW: tenantId ausente no requestContext; use requestContext.run({ tenantId }, ...).',
    );
  }
  return tenantId;
}

/**
 * Contexto efetivo da transação da UoW (parecer 15, G3): preserva o store atual (userId, requestId,
 * correlação…) e sobrescreve DEPOIS do spread apenas `tenantId`, `bypassRls=false` e
 * `outboxUnitOfWorkActive=true`; `outboxSystemJob` é descartado (o opt-in não se propaga).
 *
 * `outboxUnitOfWorkActive` marca o contexto da UoW: dentro dela é PROIBIDO usar o client estendido
 * (`prisma.*`). Hoje NINGUÉM lê a flag em runtime (G1 é do 01/15, no `$allOperations` de
 * src/lib/prisma.ts); a regra é garantida só pelo teste estático
 * tests/unit/queue/outbox.remed05-no-extended-client.test.ts. Por isso o modo `prisma` NÃO pode ser
 * ligado antes do G1.
 */
export function outboxUnitOfWorkContext(
  store: OutboxContextStore | undefined,
  allowedSystemJobs: readonly string[] = OUTBOX_SYSTEM_JOBS,
): OutboxContextStore & { tenantId: string; bypassRls: false; outboxUnitOfWorkActive: true } {
  const tenantId = requireOutboxTenantContext(store, allowedSystemJobs);
  const { outboxSystemJob: _drop, ...rest } = store ?? {};
  void _drop;
  return { ...rest, tenantId, bypassRls: false, outboxUnitOfWorkActive: true };
}

/** @deprecated nome antigo; use `outboxUnitOfWorkContext`. */
export const systemJobOutboxContext = outboxUnitOfWorkContext;
