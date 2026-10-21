import { LeadFunnel } from '@prisma/client';
import { prisma } from '../../../lib/prisma.js';
import type {
  WhatIfBaselineReader,
  WhatIfClosedDeal,
} from '../../../shared/contracts/predictiveRevenueOraclePorts.contract.js';
import { isLost, isWon } from './PrismaOracleHistoryReader.js';

/** Encerrados (ganhos/perdidos) do funil Negócio, sempre filtrado por organizationId. */
export class PrismaWhatIfBaselineReader implements WhatIfBaselineReader {
  async listClosedDeals(organizationId: string, since: Date): Promise<WhatIfClosedDeal[]> {
    const rows = await prisma.lead.findMany({
      where: { organizationId, funnel: LeadFunnel.Negocio, closedAt: { gte: since } },
      select: {
        amount: true,
        closedAt: true,
        status: true,
        pipelineStage: { select: { isWon: true, isLost: true } },
      },
    });
    return rows
      .filter((r) => r.closedAt !== null && (isWon(r) || isLost(r)))
      .map((r) => ({ won: isWon(r), amount: r.amount ?? 0, closedAt: r.closedAt as Date }));
  }
}
