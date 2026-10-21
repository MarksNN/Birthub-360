/**
 * Wiring de produção dos adaptadores Prisma (REMED-05). Ativado por `DOMAIN_EVENT_OUTBOX=prisma`
 * (ver `configureDomainEventOutboxFromEnv`), para não quebrar ambientes sem a migração do #34.
 */
import { requestContext } from '../../async-context.js';
import { prisma, withRlsContext } from '../../prisma.js';
import { domainEventMesh } from '../domainEventMesh.service.js';
import { resolveDomainEventOutboxMode } from './outboxMode.js';
import {
  PrismaConsumptionStore,
  PrismaOutboxRepository,
  PrismaOutboxUnitOfWork,
  type SqlExecutor,
  type TenantSqlRunner,
} from './prismaOutbox.repository.js';
import { type OutboxContextStore, outboxUnitOfWorkContext } from './tenantGuard.js';

export const prismaTenantRunner: TenantSqlRunner = {
  // `async/await` dentro do run: evita a perda de contexto com PrismaPromise lazy (ver async-context.ts).
  runAsTenant: (organizationId, fn) =>
    requestContext.run(
      // G3: preserva o store atual; troca só tenantId e bypassRls (relay/consumo por tenant).
      { ...(requestContext.getStore() ?? {}), tenantId: organizationId, bypassRls: false },
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
    /**
     * UoW da requisição atual. Fail-closed: exige tenantId explícito e nunca herda bypassRls
     * (o contexto da transação é recriado com bypassRls=false). Ver tenantGuard.ts.
     */
    unitOfWork: new PrismaOutboxUnitOfWork((fn) => {
      // G3: merge do store atual (preserva userId etc.), trocando só tenantId/bypassRls.
      const ctx = outboxUnitOfWorkContext(
        requestContext.getStore() as OutboxContextStore | undefined,
      );
      return requestContext.run(
        ctx,
        async () => await withRlsContext((tx) => fn(tx as unknown as SqlExecutor)),
      );
    }),
  };
}

/**
 * Configura o `domainEventMesh` de forma SÍNCRONA no boot (app e worker).
 * - production sem `DOMAIN_EVENT_OUTBOX=prisma` → lança `DomainEventOutboxConfigError` (fail-closed);
 * - `prisma` → adaptadores Prisma no mesh e UoW devolvida para registro imediato no DI;
 * - dev/test sem flag → memória (retorna `null`).
 */
export function configureDomainEventOutboxFromEnv(env: NodeJS.ProcessEnv = process.env) {
  if (resolveDomainEventOutboxMode(env) !== 'prisma') return null;
  const adapters = createPrismaOutboxAdapters();
  domainEventMesh.configure({ outbox: adapters.outbox, consumptions: adapters.consumptions });
  return { ...adapters, mesh: domainEventMesh };
}

/** Sobe o relay (somente no processo worker). Retorna o relay ou null quando em memória. */
export function startDomainEventOutboxRelay(env: NodeJS.ProcessEnv = process.env) {
  const configured = configureDomainEventOutboxFromEnv(env);
  if (!configured) return null;
  const relay = configured.mesh.createRelay();
  relay.start(Number(env.DOMAIN_EVENT_OUTBOX_RELAY_INTERVAL_MS ?? 1000));
  return relay;
}
