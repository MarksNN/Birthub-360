/**
 * G1 (parecer 15 sobre #32/#40): bloqueia, em runtime, os dois caminhos que ainda ESCAPAM da
 * transação ativa depois do `runInTransaction` (#40):
 *   1. SQL cru no client GLOBAL (`prisma.$queryRaw`, `$executeRaw`, `$queryRawUnsafe`,
 *      `$executeRawUnsafe`) — não passa por `$allOperations`, roda em outra conexão do pool, fora do
 *      tx e sem `app.current_tenant_id`;
 *   2. `prisma.$transaction(...)` aninhado fora do helper — abre outra transação/conexão.
 * Só vale quando há tx ativo no AsyncLocalStorage do `runInTransaction` OU a flag
 * `outboxUnitOfWorkActive` (UoW da outbox, #32) está ligada.
 *
 * Operações de model (`prisma.lead.update`, AuditService…) só são bloqueadas no caso (a) — flag da
 * UoW sem tx ativo no ALS. Com tx ativo (#40) elas reutilizam o tx de propósito e passam. O client transacional entregue pelo helper (`tx.$queryRaw…`, `tx.$transaction`)
 * não passa por este proxy e continua funcionando.
 */
export const GUARDED_RAW_METHODS: ReadonlySet<string> = new Set([
  '$queryRaw',
  '$executeRaw',
  '$queryRawUnsafe',
  '$executeRawUnsafe',
]);

export interface TxEscapeState {
  /** Há transação ativa do `runInTransaction` no ALS. */
  activeTransaction: boolean;
  /** `requestContext.outboxUnitOfWorkActive === true` (UoW da outbox, #32). */
  outboxUnitOfWorkActive: boolean;
}

/**
 * Caso (a): com `outboxUnitOfWorkActive` e SEM tx ativo no ALS, qualquer `prisma.*` (inclusive
 * operação de model) é proibido — rede de segurança para UoW que não usa `runInTransaction`.
 * Chamado no início do `$allOperations` do client estendido.
 */
export function assertModelOperationAllowed(
  state: TxEscapeState,
  model: string,
  operation: string,
): void {
  if (state.outboxUnitOfWorkActive && !state.activeTransaction) {
    throw new TransactionEscapeError(`${model}.${operation}`, state);
  }
}

export class TransactionEscapeError extends Error {
  constructor(
    readonly method: string,
    state: TxEscapeState,
  ) {
    const where = state.activeTransaction ? 'runInTransaction' : 'UoW da outbox';
    super(
      state.outboxUnitOfWorkActive && !state.activeTransaction && !method.startsWith('$')
        ? `prisma.* proibido dentro da UoW; use o tx (prisma.${method} com outboxUnitOfWorkActive=true e sem runInTransaction ativo)`
        : method === '$transaction'
          ? `prisma.$transaction proibido dentro de ${where} (abriria outra transação/conexão); use o tx recebido (tx.$transaction reutiliza a transação)`
          : `prisma.${method} (client global) proibido dentro de ${where}: rodaria fora do tx e sem tenant; use tx.${method}`,
    );
    this.name = 'TransactionEscapeError';
  }
}

export function guardGlobalClientEscapes<T extends object>(
  client: T,
  getState: () => TxEscapeState,
): T {
  return new Proxy(client, {
    get(target, prop, _receiver) {
      const value = Reflect.get(target, prop, target) as unknown;
      if (typeof prop === 'string' && (GUARDED_RAW_METHODS.has(prop) || prop === '$transaction')) {
        if (typeof value !== 'function') return value;
        return (...args: unknown[]) => {
          const state = getState();
          if (state.activeTransaction || state.outboxUnitOfWorkActive) {
            throw new TransactionEscapeError(prop, state);
          }
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return typeof value === 'function'
        ? (value as (...a: unknown[]) => unknown).bind(target)
        : value;
    },
  });
}
