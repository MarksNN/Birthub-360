import { prisma } from './prisma.js';
import { MODELS_WITH_ORGANIZATION_ID } from './tenant-scoping-registry.js';

export { MODELS_WITH_ORGANIZATION_ID };

/**
 * Retorna uma instância do Prisma Client estendida para garantir o Row-Level Security (RLS)
 * a nível de aplicação. Todas as operações de leitura e escrita interceptadas por esta
 * extensão vão automaticamente injetar e validar o `organizationId` — mas apenas nos modelos
 * que de fato possuem essa coluna.
 *
 * @param organizationId - ID do locatário atual
 */
export function getTenantPrisma(organizationId: string) {
  if (!organizationId) {
    throw new Error('Tenant Prisma initialization requires a valid organizationId');
  }

  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!MODELS_WITH_ORGANIZATION_ID.has(model)) {
            return query(args);
          }

          // Se a operação for find/update/delete/aggregate/groupBy, precisamos forçar o organizationId no where
          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow' ||
            operation === 'findFirst' ||
            operation === 'findFirstOrThrow' ||
            operation === 'findMany' ||
            operation === 'count' ||
            operation === 'aggregate' ||
            operation === 'groupBy' ||
            operation === 'update' ||
            operation === 'updateMany' ||
            operation === 'delete' ||
            operation === 'deleteMany'
          ) {
            args.where = {
              ...(args.where || {}),
              organizationId,
            };
          }

          // Se a operação for de criação (create), precisamos forçar a injeção do organizationId nos dados
          if (operation === 'create') {
            const createData = args.data as Record<string, unknown>;
            args.data = {
              ...createData,
              organizationId,
            } as typeof args.data;
          }

          // Se for createMany, iterar para garantir o organizationId
          if (operation === 'createMany' && Array.isArray(args.data)) {
            const createManyData = args.data as Array<Record<string, unknown>>;
            args.data = createManyData.map((item) => ({
              ...item,
              organizationId,
            })) as typeof args.data;
          }

          // Se for upsert, garantir organizationId no create e no where, e blindar o update
          if (operation === 'upsert') {
            const a = args as Record<string, unknown>;
            if (a.create) {
              a.create = { ...(a.create as Record<string, unknown>), organizationId };
            }
            if (a.where) {
              a.where = { ...(a.where as Record<string, unknown>), organizationId };
            }
            if (a.update && typeof a.update === 'object' && 'organizationId' in a.update) {
              // biome-ignore lint/performance/noDelete: remoção obrigatória para segurança multi-tenant
              delete (a.update as Record<string, unknown>).organizationId;
            }
          }

          // Em update e updateMany, garantir que organizationId nunca possa ser alterado no payload
          if (operation === 'update' || operation === 'updateMany') {
            const a = args as Record<string, unknown>;
            if (a.data && typeof a.data === 'object' && 'organizationId' in a.data) {
              // biome-ignore lint/performance/noDelete: remoção obrigatória para segurança multi-tenant
              delete (a.data as Record<string, unknown>).organizationId;
            }
          }

          return query(args);
        },
      },
    },
  });
}
