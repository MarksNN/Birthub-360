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
    return prisma.$transaction(async (tx) => {
      return fn(tx as unknown as typeof prisma);
    });
  });
}
