/**
 * REMED-05 — guarda de contexto da UoW da outbox (decisão do Marks, 2026-10-21):
 * - fail-closed sem tenant: nunca grava com `app.current_tenant_id` vazio;
 * - nunca herda `bypassRls` do contexto ambiente;
 * - exceção: job de sistema EXPLÍCITO, por opt-in nomeado em `OUTBOX_SYSTEM_JOBS`. Mesmo assim
 *   o job roda com tenant explícito e `bypassRls=false` (ver `systemJobOutboxContext`).
 */
export class OutboxTenantContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OutboxTenantContextError';
  }
}

/** Allowlist documentada de jobs de sistema que podem abrir a UoW a partir de um contexto com bypass. */
export const OUTBOX_SYSTEM_JOBS: ReadonlySet<string> = new Set<string>([
  // Adicione aqui com o nome do job e o motivo; revisão do 24 obrigatória.
]);

export interface OutboxContextStore {
  tenantId?: string;
  bypassRls?: boolean;
  outboxSystemJob?: string;
}

export function requireOutboxTenantContext(store: OutboxContextStore | undefined): string {
  const tenantId = store?.tenantId?.trim();
  if (store?.bypassRls) {
    const job = store.outboxSystemJob;
    if (!job || !OUTBOX_SYSTEM_JOBS.has(job)) {
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
 * Contexto efetivo para a transação: SEMPRE `bypassRls=false` e tenant explícito, inclusive para
 * job de sistema com opt-in (o bypass do ambiente nunca é herdado pela transação da outbox).
 */
export function systemJobOutboxContext(store: OutboxContextStore | undefined): {
  tenantId: string;
  bypassRls: false;
} {
  return { tenantId: requireOutboxTenantContext(store), bypassRls: false };
}
