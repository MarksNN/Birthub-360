/**
 * Contexto Transacional com Propagação Durável de Tenancy (Passo 08 / Agente 01)
 * Garante que transações assíncronas no Prisma propaguem o current_tenant_id e respeitem RLS.
 */

import { requestContext } from '../async-context.js';
import { prisma } from '../prisma.js';

export async function runInTransaction<T>(
  tenantId: string,
  fn: (tx: typeof prisma) => Promise<T>,
): Promise<T> {
  return requestContext.run({ tenantId }, async () => {
    // biome-ignore lint/plugin/no-prisma-tx-escape: uso legado congelado no baseline (parecer 15 #40 L1); migrar para runInTransaction
    return prisma.$transaction(async (tx) => {
      return fn(tx as unknown as typeof prisma);
    });
  });
}
