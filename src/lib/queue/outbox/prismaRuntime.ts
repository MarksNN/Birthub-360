/**
 * Wiring de produção dos adaptadores Prisma (REMED-05). Ativado por `DOMAIN_EVENT_OUTBOX=prisma`
 * (ver `configureDomainEventOutboxFromEnv`), para não quebrar ambientes sem a migração do #34.
 */
import { requestContext } from '../../async-context.js';
import { prisma, withRlsContext } from '../../prisma.js';
import {
  PrismaConsumptionStore,
  PrismaOutboxRepository,
  PrismaOutboxUnitOfWork,
  type SqlExecutor,
  type TenantSqlRunner,
} from './prismaOutbox.repository.js';

export const prismaTenantRunner: TenantSqlRunner = {
  // `async/await` dentro do run: evita a perda de contexto com PrismaPromise lazy (ver async-context.ts).
  runAsTenant: (organizationId, fn) =>
    requestContext.run(
      { tenantId: organizationId },
      async () => await withRlsContext((tx) => fn(tx as unknown as SqlExecutor)),
    ),
  // Descoberta via allowlist de bypass já existente para `Organization` (BYPASS_RLS_ALLOWED_MODELS);
  // não usa role BYPASSRLS. As tabelas da outbox são sempre lidas com o tenant setado.
  listTenants: async () => {
    const orgs = await requestContext.run(
      { bypassRls: true },
      async () => await prisma.organization.findMany({ select: { id: true } }),
    );
    return orgs.map((o: { id: string }) => o.id);
  },
};

export function createPrismaOutboxAdapters(runner: TenantSqlRunner = prismaTenantRunner) {
  return {
    outbox: new PrismaOutboxRepository(runner),
    consumptions: new PrismaConsumptionStore(runner),
    /** UoW da requisição atual: usa o tenant do requestContext (withRlsContext). */
    unitOfWork: new PrismaOutboxUnitOfWork((fn) =>
      withRlsContext((tx) => fn(tx as unknown as SqlExecutor)),
    ),
  };
}

/**
 * Liga os adaptadores Prisma no `domainEventMesh` quando `DOMAIN_EVENT_OUTBOX=prisma`.
 * Sem a flag (ou antes do merge do #34), o mesh segue com a implementação em memória.
 */
export async function configureDomainEventOutboxFromEnv(env: NodeJS.ProcessEnv = process.env) {
  if (env.DOMAIN_EVENT_OUTBOX !== 'prisma') return null;
  const { domainEventMesh } = await import('../domainEventMesh.service.js');
  const adapters = createPrismaOutboxAdapters();
  domainEventMesh.configure({ outbox: adapters.outbox, consumptions: adapters.consumptions });
  return { ...adapters, mesh: domainEventMesh };
}

/** Sobe o relay (somente no processo worker). Retorna o relay ou null quando desativado. */
export async function startDomainEventOutboxRelay(env: NodeJS.ProcessEnv = process.env) {
  const configured = await configureDomainEventOutboxFromEnv(env);
  if (!configured) return null;
  const relay = configured.mesh.createRelay();
  relay.start(Number(env.DOMAIN_EVENT_OUTBOX_RELAY_INTERVAL_MS ?? 1000));
  return relay;
}
