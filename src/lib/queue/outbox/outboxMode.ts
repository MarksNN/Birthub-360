/**
 * REMED-05 — modo da outbox e fail-closed em produção.
 * Em `NODE_ENV=production`, a outbox em memória é proibida: o boot falha se
 * `DOMAIN_EVENT_OUTBOX` não for `prisma`. Em dev/test o padrão continua `memory`.
 */
export type DomainEventOutboxMode = 'prisma' | 'memory';

export class DomainEventOutboxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainEventOutboxConfigError';
  }
}

export function resolveDomainEventOutboxMode(
  env: NodeJS.ProcessEnv = process.env,
): DomainEventOutboxMode {
  const raw = (env.DOMAIN_EVENT_OUTBOX ?? '').trim().toLowerCase();
  if (raw && raw !== 'prisma' && raw !== 'memory') {
    throw new DomainEventOutboxConfigError(
      `DOMAIN_EVENT_OUTBOX inválido: "${raw}" (use "prisma" ou "memory").`,
    );
  }
  if (env.NODE_ENV === 'production' && raw !== 'prisma') {
    throw new DomainEventOutboxConfigError(
      'REMED-05 fail-closed: NODE_ENV=production exige DOMAIN_EVENT_OUTBOX=prisma (a outbox em memória perde eventos em restart/réplicas). ' +
        'Defina DOMAIN_EVENT_OUTBOX=prisma e aplique a migração 20261020210000_remed05_domain_event_outbox.',
    );
  }
  return raw === 'prisma' ? 'prisma' : 'memory';
}
